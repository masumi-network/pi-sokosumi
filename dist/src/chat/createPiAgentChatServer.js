import http from "node:http";
import { extractSokosumiIdentityMetadata } from "../identity/resolveSokosumiIdentity.js";
export class PiAgentChatRequestError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "PiAgentChatRequestError";
        this.statusCode = statusCode;
    }
}
export function normalizePiAgentChatRequest({ body = {}, headers = {}, agentId, surface, defaultAgentId, defaultSurface = "chat", supportedAgentIds, supportedSurfaces, metadata = {} } = {}) {
    const normalizedAgentId = normalizeIdentifier(firstString(agentId, body?.agentId, body?.agent_id, body?.coworker, body?.metadata?.agentId, body?.metadata?.coworker, defaultAgentId));
    if (supportedAgentIds?.length) {
        if (!normalizedAgentId || !includesIdentifier(supportedAgentIds, normalizedAgentId)) {
            throw new PiAgentChatRequestError("Unsupported agent for chat request.");
        }
    }
    const normalizedSurface = normalizeIdentifier(firstString(surface, body?.surface, body?.interface, defaultSurface));
    if (!normalizedSurface) {
        throw new PiAgentChatRequestError("Chat request surface is required.");
    }
    if (!isSupportedSurface(normalizedSurface, normalizedAgentId, supportedSurfaces)) {
        throw new PiAgentChatRequestError(`Unsupported chat surface: ${normalizedSurface}.`);
    }
    const identity = (extractSokosumiIdentityMetadata(body, headers) || {});
    const organizationId = firstString(body?.organizationId, body?.organization_id, body?.workspaceId, body?.workspace_id, body?.metadata?.organizationId, identity.organizationId, identity.workspaceId, headerValue(headers, "x-organization-id"), headerValue(headers, "x-delegation-organization-id"));
    const attachments = Array.isArray(body?.attachments)
        ? body.attachments
        : Array.isArray(body?.files)
            ? body.files
            : undefined;
    return {
        ...(normalizedAgentId ? { agentId: normalizedAgentId } : {}),
        surface: normalizedSurface,
        userId: firstString(body?.userId, body?.user_id, body?.senderId, body?.sender_id, body?.from?.id, body?.from?.email, body?.sender?.id, body?.sender?.email, body?.message?.from?.id, body?.message?.from?.email, body?.metadata?.userId, identity.userId, headerValue(headers, "x-user-id"), headerValue(headers, "x-delegation-user-id"), "anonymous"),
        ...(organizationId ? { organizationId } : {}),
        message: extractMessage(body),
        ...(attachments ? { attachments } : {}),
        metadata: {
            ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}),
            ...metadata,
            ...(Object.keys(identity).length ? { identity } : {}),
            sourcePayloadType: detectPayloadType(body),
            routeSurface: normalizedSurface,
            sourcePayload: sanitizePayload(body)
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
            sendJson(res, getStatusCode(error), { error: error?.message || "Internal server error" });
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
    const statusCode = Number(error?.statusCode || error?.status || 500);
    return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}
function extractMessage(body) {
    const message = firstString(body?.message, body?.text, body?.content, body?.body, body?.comment, body?.description, body?.prompt, body?.input, body?.message?.text, body?.message?.body, body?.message?.content, body?.email?.text, body?.email?.body, body?.comment?.body, body?.issue?.body, body?.issue?.title, body?.pull_request?.body, body?.pull_request?.title, body?.tweet?.text, body?.post?.text, getLastMessageText(body?.messages));
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
    if (!message || typeof message !== "object")
        return undefined;
    const value = message;
    if (typeof value.content === "string")
        return value.content;
    if (typeof value.text === "string")
        return value.text;
    if (typeof value.body === "string")
        return value.body;
    if (Array.isArray(value.content)) {
        return value.content
            .map((part) => typeof part === "string" ? part : firstString(part?.text, part?.content))
            .filter(Boolean)
            .join("\n")
            .trim() || undefined;
    }
    return undefined;
}
function detectPayloadType(body) {
    if (body?.issue || body?.pull_request)
        return "github";
    if (body?.tweet || body?.post)
        return "social";
    if (body?.email)
        return "email";
    if (body?.message || body?.messages)
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
    if (typeof value !== "object")
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
    if (Array.isArray(supportedSurfaces))
        return includesIdentifier(supportedSurfaces, surface);
    if (!agentId)
        return false;
    const values = supportedSurfaces[agentId] || supportedSurfaces[agentId.toLowerCase()];
    return Array.isArray(values) && includesIdentifier(values, surface);
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