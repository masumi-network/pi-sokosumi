import http from "node:http";
import { extractSokosumiIdentityMetadata } from "../identity/resolveSokosumiIdentity.js";
import { getPathValue, getProperty, getRecordProperty, isRecord } from "../sharedTypes.js";
export class PiAgentChatRequestError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "PiAgentChatRequestError";
        this.statusCode = statusCode;
    }
}
export function normalizePiAgentChatRequest({ body = {}, headers = {}, agentId, surface, defaultAgentId, defaultSurface = "chat", supportedAgentIds, supportedSurfaces, metadata = {} } = {}) {
    const payload = isRecord(body) ? body : {};
    const bodyMetadata = getRecordProperty(payload, "metadata");
    const normalizedAgentId = normalizeIdentifier(firstString(agentId, getProperty(payload, "agentId"), getProperty(payload, "agent_id"), getProperty(payload, "coworker"), getProperty(bodyMetadata, "agentId"), getProperty(bodyMetadata, "coworker"), defaultAgentId));
    if (supportedAgentIds?.length) {
        if (!normalizedAgentId || !includesIdentifier(supportedAgentIds, normalizedAgentId)) {
            throw new PiAgentChatRequestError("Unsupported agent for chat request.");
        }
    }
    const normalizedSurface = normalizeIdentifier(firstString(surface, getProperty(payload, "surface"), getProperty(payload, "interface"), defaultSurface));
    if (!normalizedSurface) {
        throw new PiAgentChatRequestError("Chat request surface is required.");
    }
    if (!isSupportedSurface(normalizedSurface, normalizedAgentId, supportedSurfaces)) {
        throw new PiAgentChatRequestError(`Unsupported chat surface: ${normalizedSurface}.`);
    }
    const identity = extractSokosumiIdentityMetadata(payload, headers);
    const organizationId = firstString(getProperty(payload, "organizationId"), getProperty(payload, "organization_id"), getProperty(payload, "workspaceId"), getProperty(payload, "workspace_id"), getProperty(bodyMetadata, "organizationId"), identity?.organizationId, identity?.workspaceId, headerValue(headers, "x-organization-id"), headerValue(headers, "x-delegation-organization-id"));
    const attachmentsValue = getProperty(payload, "attachments");
    const filesValue = getProperty(payload, "files");
    const attachments = Array.isArray(attachmentsValue)
        ? attachmentsValue
        : Array.isArray(filesValue)
            ? filesValue
            : undefined;
    return {
        ...(normalizedAgentId ? { agentId: normalizedAgentId } : {}),
        surface: normalizedSurface,
        userId: firstString(getProperty(payload, "userId"), getProperty(payload, "user_id"), getProperty(payload, "senderId"), getProperty(payload, "sender_id"), getPathValue(payload, "from", "id"), getPathValue(payload, "from", "email"), getPathValue(payload, "sender", "id"), getPathValue(payload, "sender", "email"), getPathValue(payload, "message", "from", "id"), getPathValue(payload, "message", "from", "email"), getProperty(bodyMetadata, "userId"), identity?.userId, headerValue(headers, "x-user-id"), headerValue(headers, "x-delegation-user-id"), "anonymous") || "anonymous",
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
export function createPiAgentChatRouteHandler(options) {
    const path = options.path || "/v1/chat";
    const maxBodyBytes = options.maxBodyBytes || 2 * 1024 * 1024;
    if (typeof options.handleChat !== "function") {
        throw new Error("createPiAgentChatRouteHandler requires handleChat.");
    }
    return async function handlePiAgentChatRoute(req, res) {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        if (url.pathname !== path)
            return false;
        if (req.method !== "POST") {
            sendJson(res, 405, { error: "Method not allowed" });
            return true;
        }
        let body;
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
                });
            const result = await options.handleChat({ request, body, headers: req.headers, req });
            sendJson(res, 200, result);
        }
        catch (error) {
            await options.onError?.({ error, req, res, body });
            sendJson(res, getStatusCode(error), { error: getErrorMessage(error) });
        }
        return true;
    };
}
export function startPiAgentChatServer(options) {
    const port = options.port ?? 3000;
    const healthPath = options.healthPath || "/healthz";
    const chatRouteHandler = createPiAgentChatRouteHandler(options);
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        if (req.method === "GET" && url.pathname === healthPath) {
            return sendJson(res, 200, options.healthResponse ? options.healthResponse() : { status: "ok" });
        }
        if (await chatRouteHandler(req, res))
            return;
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
export async function readPiAgentChatJson(req, maxBodyBytes = 2 * 1024 * 1024) {
    return readJson(req, maxBodyBytes);
}
export function sendPiAgentChatJson(res, statusCode, body) {
    sendJson(res, statusCode, body);
}
async function readJson(req, maxBodyBytes) {
    const chunks = [];
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
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new PiAgentChatRequestError("Request body must be valid JSON.");
    }
}
function sendJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(`${JSON.stringify(body)}\n`);
}
function getStatusCode(error) {
    const source = isRecord(error) ? error : {};
    const statusCode = Number(source.statusCode || source.status || 500);
    return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}
function getErrorMessage(error) {
    if (error instanceof Error && error.message)
        return error.message;
    if (isRecord(error) && typeof error.message === "string" && error.message)
        return error.message;
    return "Internal server error";
}
function extractMessage(body) {
    const message = firstString(getProperty(body, "message"), getProperty(body, "text"), getProperty(body, "content"), getProperty(body, "body"), getProperty(body, "comment"), getProperty(body, "description"), getProperty(body, "prompt"), getProperty(body, "input"), getPathValue(body, "message", "text"), getPathValue(body, "message", "body"), getPathValue(body, "message", "content"), getPathValue(body, "email", "text"), getPathValue(body, "email", "body"), getPathValue(body, "comment", "body"), getPathValue(body, "issue", "body"), getPathValue(body, "issue", "title"), getPathValue(body, "pull_request", "body"), getPathValue(body, "pull_request", "title"), getPathValue(body, "tweet", "text"), getPathValue(body, "post", "text"), getLastMessageText(getProperty(body, "messages")));
    return String(message || "").trim();
}
function getLastMessageText(messages) {
    if (!Array.isArray(messages))
        return undefined;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const text = getMessageText(messages[index]);
        if (text)
            return text;
    }
    return undefined;
}
function getMessageText(message) {
    if (typeof message === "string")
        return message;
    if (!isRecord(message))
        return undefined;
    if (typeof message.content === "string")
        return message.content;
    if (typeof message.text === "string")
        return message.text;
    if (typeof message.body === "string")
        return message.body;
    if (Array.isArray(message.content)) {
        return message.content
            .map((part) => typeof part === "string" ? part : firstString(getPathValue(part, "text"), getPathValue(part, "content")))
            .filter((part) => Boolean(part))
            .join("\n")
            .trim() || undefined;
    }
    return undefined;
}
function detectPayloadType(body) {
    if (body.issue || body.pull_request)
        return "github";
    if (body.tweet || body.post)
        return "social";
    if (body.email)
        return "email";
    if (body.message || body.messages)
        return "message";
    return "chat";
}
function sanitizePayload(value, depth = 0) {
    if (depth > 4)
        return "[truncated]";
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return value;
    if (Array.isArray(value))
        return value.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
    if (!isRecord(value))
        return String(value);
    const result = {};
    for (const [key, child] of Object.entries(value)) {
        if (/token|secret|password|authorization|api[_-]?key|signature/i.test(key)) {
            result[key] = "[redacted]";
            continue;
        }
        result[key] = sanitizePayload(child, depth + 1);
    }
    return result;
}
function isSupportedSurface(surface, agentId, supportedSurfaces) {
    if (!supportedSurfaces)
        return true;
    if (isSupportedSurfaceList(supportedSurfaces))
        return includesIdentifier(supportedSurfaces, surface);
    if (!agentId)
        return false;
    const surfaceMap = supportedSurfaces;
    const values = surfaceMap[agentId] || surfaceMap[agentId.toLowerCase()];
    return Array.isArray(values) && includesIdentifier(values, surface);
}
function isSupportedSurfaceList(value) {
    return Array.isArray(value);
}
function includesIdentifier(values, value) {
    return values.map((item) => normalizeIdentifier(item)).includes(value);
}
function normalizeIdentifier(value) {
    const text = firstString(value);
    return text ? text.toLowerCase() : undefined;
}
function firstString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim())
            return value.trim();
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return undefined;
}
function headerValue(headers, name) {
    const value = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
}
//# sourceMappingURL=createPiAgentChatServer.js.map