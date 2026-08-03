import http from "node:http";
import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "node:http";
import { extractSokosumiIdentityMetadata } from "../identity/resolveSokosumiIdentity.js";
import type { Awaitable, JsonObject, JsonValue } from "../sharedTypes.js";
import { isRecord } from "../sharedTypes.js";

export type PiAgentChatRequest = {
  agentId?: string;
  surface: string;
  userId: string;
  organizationId?: string;
  message: string;
  attachments?: unknown[];
  metadata?: Record<string, unknown>;
};

export type PiAgentChatHandlerResult = JsonValue;

export type PiAgentSupportedSurfaces = readonly string[] | Record<string, readonly string[]>;

export type NormalizePiAgentChatRequestInput = {
  body?: unknown;
  headers?: IncomingHttpHeaders;
  agentId?: unknown;
  surface?: unknown;
  defaultAgentId?: string;
  defaultSurface?: string;
  supportedAgentIds?: readonly string[];
  supportedSurfaces?: PiAgentSupportedSurfaces;
  metadata?: Record<string, unknown>;
};

export type PiAgentChatRequestGuardInput = {
  req: IncomingMessage;
  res: ServerResponse;
  headers: IncomingHttpHeaders;
};

export type NormalizePiAgentChatRouteRequestInput = {
  body: unknown;
  headers: IncomingHttpHeaders;
  req: IncomingMessage;
};

export type PiAgentChatHandlerInput<TRequest> = NormalizePiAgentChatRouteRequestInput & {
  request: TRequest;
};

export type PiAgentChatErrorHandlerInput = {
  error: unknown;
  req: IncomingMessage;
  res: ServerResponse;
  body?: unknown;
};

export type PiAgentChatRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<boolean>;

type PiAgentChatRequestNormalizer<TRequest> = PiAgentChatRequest extends TRequest
  ? { normalizeRequest?: (input: NormalizePiAgentChatRouteRequestInput) => Awaitable<TRequest> }
  : { normalizeRequest: (input: NormalizePiAgentChatRouteRequestInput) => Awaitable<TRequest> };

export type PiAgentChatRouteOptions<
  TRequest = PiAgentChatRequest,
  TResult extends PiAgentChatHandlerResult = PiAgentChatHandlerResult
> = {
  path?: string;
  maxBodyBytes?: number;
  defaultAgentId?: string;
  defaultSurface?: string;
  supportedAgentIds?: readonly string[];
  supportedSurfaces?: PiAgentSupportedSurfaces;
  authorize?: (input: PiAgentChatRequestGuardInput) => Awaitable<void>;
  rateLimit?: (input: PiAgentChatRequestGuardInput) => Awaitable<void>;
  handleChat: (input: PiAgentChatHandlerInput<TRequest>) => Awaitable<TResult>;
  onError?: (input: PiAgentChatErrorHandlerInput) => Awaitable<void>;
} & PiAgentChatRequestNormalizer<TRequest>;

export type PiAgentChatServerOptions<
  TRequest = PiAgentChatRequest,
  TResult extends PiAgentChatHandlerResult = PiAgentChatHandlerResult
> = PiAgentChatRouteOptions<TRequest, TResult> & {
  port?: number;
  host?: string;
  healthPath?: string;
  healthResponse?: () => PiAgentChatHandlerResult;
  logger?: Pick<Console, "log" | "error">;
};

export class PiAgentChatRequestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PiAgentChatRequestError";
    this.statusCode = statusCode;
  }
}

export function normalizePiAgentChatRequest({
  body = {},
  headers = {},
  agentId,
  surface,
  defaultAgentId,
  defaultSurface = "chat",
  supportedAgentIds,
  supportedSurfaces,
  metadata = {}
}: NormalizePiAgentChatRequestInput = {}): PiAgentChatRequest {
  const payload = isRecord(body) ? body : {};
  const bodyMetadata = recordProperty(payload, "metadata");
  const normalizedAgentId = normalizeIdentifier(firstString(
    agentId,
    property(payload, "agentId"),
    property(payload, "agent_id"),
    property(payload, "coworker"),
    property(bodyMetadata, "agentId"),
    property(bodyMetadata, "coworker"),
    defaultAgentId
  ));

  if (supportedAgentIds?.length) {
    if (!normalizedAgentId || !includesIdentifier(supportedAgentIds, normalizedAgentId)) {
      throw new PiAgentChatRequestError("Unsupported agent for chat request.");
    }
  }

  const normalizedSurface = normalizeIdentifier(firstString(
    surface,
    property(payload, "surface"),
    property(payload, "interface"),
    defaultSurface
  ));
  if (!normalizedSurface) {
    throw new PiAgentChatRequestError("Chat request surface is required.");
  }

  if (!isSupportedSurface(normalizedSurface, normalizedAgentId, supportedSurfaces)) {
    throw new PiAgentChatRequestError(`Unsupported chat surface: ${normalizedSurface}.`);
  }

  const identity = extractSokosumiIdentityMetadata(payload, headers);
  const organizationId = firstString(
    property(payload, "organizationId"),
    property(payload, "organization_id"),
    property(payload, "workspaceId"),
    property(payload, "workspace_id"),
    property(bodyMetadata, "organizationId"),
    identity?.organizationId,
    identity?.workspaceId,
    headerValue(headers, "x-organization-id"),
    headerValue(headers, "x-delegation-organization-id")
  );
  const attachmentsValue = property(payload, "attachments");
  const filesValue = property(payload, "files");
  const attachments = Array.isArray(attachmentsValue)
    ? attachmentsValue
    : Array.isArray(filesValue)
      ? filesValue
      : undefined;

  return {
    ...(normalizedAgentId ? { agentId: normalizedAgentId } : {}),
    surface: normalizedSurface,
    userId: firstString(
      property(payload, "userId"),
      property(payload, "user_id"),
      property(payload, "senderId"),
      property(payload, "sender_id"),
      path(payload, "from", "id"),
      path(payload, "from", "email"),
      path(payload, "sender", "id"),
      path(payload, "sender", "email"),
      path(payload, "message", "from", "id"),
      path(payload, "message", "from", "email"),
      property(bodyMetadata, "userId"),
      identity?.userId,
      headerValue(headers, "x-user-id"),
      headerValue(headers, "x-delegation-user-id"),
      "anonymous"
    ) || "anonymous",
    ...(organizationId ? { organizationId } : {}),
    message: extractMessage(payload),
    ...(attachments ? { attachments } : {}),
    metadata: {
      ...(bodyMetadata || {}),
      ...metadata,
      ...(identity ? { identity } : {}),
      sourcePayloadType: detectPayloadType(payload),
      routeSurface: normalizedSurface,
      sourcePayload: sanitizePayload(payload)
    }
  };
}

export function createPiAgentChatRouteHandler<
  TRequest = PiAgentChatRequest,
  TResult extends PiAgentChatHandlerResult = PiAgentChatHandlerResult
>(options: PiAgentChatRouteOptions<TRequest, TResult>): PiAgentChatRouteHandler {
  const path = options.path || "/v1/chat";
  const maxBodyBytes = options.maxBodyBytes || 2 * 1024 * 1024;
  if (typeof options.handleChat !== "function") {
    throw new Error("createPiAgentChatRouteHandler requires handleChat.");
  }

  return async function handlePiAgentChatRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== path) return false;

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return true;
    }

    let body: unknown;
    try {
      await options.authorize?.({ req, res, headers: req.headers });
      await options.rateLimit?.({ req, res, headers: req.headers });
      body = await readJson(req, maxBodyBytes);
      const request = options.normalizeRequest
        ? await options.normalizeRequest({ body, headers: req.headers, req })
        : normalizePiAgentChatRequest({
            body,
            headers: req.headers,
            defaultAgentId: options.defaultAgentId,
            defaultSurface: options.defaultSurface,
            supportedAgentIds: options.supportedAgentIds,
            supportedSurfaces: options.supportedSurfaces
          }) as TRequest;
      const result = await options.handleChat({ request, body, headers: req.headers, req });
      sendJson(res, 200, result);
    } catch (error: unknown) {
      await options.onError?.({ error, req, res, body });
      sendJson(res, getStatusCode(error), { error: getErrorMessage(error) });
    }

    return true;
  };
}

export function startPiAgentChatServer<
  TRequest = PiAgentChatRequest,
  TResult extends PiAgentChatHandlerResult = PiAgentChatHandlerResult
>(options: PiAgentChatServerOptions<TRequest, TResult>): Server {
  const port = options.port ?? 3000;
  const healthPath = options.healthPath || "/healthz";
  const chatRouteHandler = createPiAgentChatRouteHandler(options);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === healthPath) {
      return sendJson(res, 200, options.healthResponse ? options.healthResponse() : { status: "ok" });
    }

    if (await chatRouteHandler(req, res)) return;
    sendJson(res, 404, { error: "Not found" });
  });

  server.listen(port, options.host, () => {
    options.logger?.log?.(JSON.stringify({
      event: "pi_agent_chat_server_started",
      port,
      host: options.host,
      path: options.path || "/v1/chat"
    }));
  });
  return server;
}

export async function readPiAgentChatJson(
  req: IncomingMessage,
  maxBodyBytes = 2 * 1024 * 1024
): Promise<unknown> {
  return readJson(req, maxBodyBytes);
}

export function sendPiAgentChatJson(res: ServerResponse, statusCode: number, body: unknown): void {
  sendJson(res, statusCode, body);
}

async function readJson(req: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) {
      throw new PiAgentChatRequestError("Request body is too large.", 413);
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new PiAgentChatRequestError("Request body must be valid JSON.");
  }
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(body)}\n`);
}

function getStatusCode(error: unknown): number {
  const source = isRecord(error) ? error : {};
  const statusCode = Number(source.statusCode || source.status || 500);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === "string" && error.message) return error.message;
  return "Internal server error";
}

function extractMessage(body: Record<string, unknown>): string {
  const message = firstString(
    property(body, "message"),
    property(body, "text"),
    property(body, "content"),
    property(body, "body"),
    property(body, "comment"),
    property(body, "description"),
    property(body, "prompt"),
    property(body, "input"),
    path(body, "message", "text"),
    path(body, "message", "body"),
    path(body, "message", "content"),
    path(body, "email", "text"),
    path(body, "email", "body"),
    path(body, "comment", "body"),
    path(body, "issue", "body"),
    path(body, "issue", "title"),
    path(body, "pull_request", "body"),
    path(body, "pull_request", "title"),
    path(body, "tweet", "text"),
    path(body, "post", "text"),
    getLastMessageText(property(body, "messages"))
  );
  return String(message || "").trim();
}

function getLastMessageText(messages: unknown): string | undefined {
  if (!Array.isArray(messages)) return undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = getMessageText(messages[index]);
    if (text) return text;
  }
  return undefined;
}

function getMessageText(message: unknown): string | undefined {
  if (typeof message === "string") return message;
  if (!isRecord(message)) return undefined;
  if (typeof message.content === "string") return message.content;
  if (typeof message.text === "string") return message.text;
  if (typeof message.body === "string") return message.body;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => typeof part === "string" ? part : firstString(pathValue(part, "text"), pathValue(part, "content")))
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .trim() || undefined;
  }
  return undefined;
}

function detectPayloadType(body: Record<string, unknown>): "github" | "social" | "email" | "message" | "chat" {
  if (body.issue || body.pull_request) return "github";
  if (body.tweet || body.post) return "social";
  if (body.email) return "email";
  if (body.message || body.messages) return "message";
  return "chat";
}

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
  if (!isRecord(value)) return String(value);

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|authorization|api[_-]?key|signature/i.test(key)) {
      result[key] = "[redacted]";
      continue;
    }
    result[key] = sanitizePayload(child, depth + 1);
  }
  return result;
}

function isSupportedSurface(
  surface: string,
  agentId: string | undefined,
  supportedSurfaces?: PiAgentSupportedSurfaces
): boolean {
  if (!supportedSurfaces) return true;
  if (isSupportedSurfaceList(supportedSurfaces)) return includesIdentifier(supportedSurfaces, surface);
  if (!agentId) return false;
  const surfaceMap = supportedSurfaces;
  const values = surfaceMap[agentId] || surfaceMap[agentId.toLowerCase()];
  return Array.isArray(values) && includesIdentifier(values, surface);
}

function isSupportedSurfaceList(value: PiAgentSupportedSurfaces): value is readonly string[] {
  return Array.isArray(value);
}

function includesIdentifier(values: readonly string[], value: string): boolean {
  return values.map((item) => normalizeIdentifier(item)).includes(value);
}

function normalizeIdentifier(value: unknown): string | undefined {
  const text = firstString(value);
  return text ? text.toLowerCase() : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name] || headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function property(source: Record<string, unknown> | undefined, key: string): unknown {
  return source?.[key];
}

function recordProperty(
  source: Record<string, unknown> | undefined,
  key: string
): Record<string, unknown> | undefined {
  const value = property(source, key);
  return isRecord(value) ? value : undefined;
}

function path(source: Record<string, unknown>, ...keys: string[]): unknown {
  let value: unknown = source;
  for (const key of keys) {
    if (!isRecord(value)) return undefined;
    value = value[key];
  }
  return value;
}

function pathValue(source: unknown, key: string): unknown {
  return isRecord(source) ? source[key] : undefined;
}

export type { JsonObject, JsonValue } from "../sharedTypes.js";
