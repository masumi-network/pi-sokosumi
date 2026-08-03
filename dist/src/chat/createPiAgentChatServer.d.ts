import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "node:http";
import type { Awaitable } from "../sharedTypes.js";
export type PiAgentChatRequest = {
    agentId?: string;
    surface: string;
    userId: string;
    organizationId?: string;
    message: string;
    attachments?: unknown[];
    metadata?: Record<string, unknown>;
};
export type PiAgentChatHandlerResult = unknown;
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
export type PiAgentChatRouteHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
type PiAgentChatRequestNormalizer<TRequest> = PiAgentChatRequest extends TRequest ? {
    normalizeRequest?: (input: NormalizePiAgentChatRouteRequestInput) => Awaitable<TRequest>;
} : {
    normalizeRequest: (input: NormalizePiAgentChatRouteRequestInput) => Awaitable<TRequest>;
};
export type PiAgentChatRouteOptions<TRequest = PiAgentChatRequest, TResult = PiAgentChatHandlerResult> = {
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
export type PiAgentChatServerOptions<TRequest = PiAgentChatRequest, TResult = PiAgentChatHandlerResult> = PiAgentChatRouteOptions<TRequest, TResult> & {
    port?: number;
    host?: string;
    healthPath?: string;
    healthResponse?: () => PiAgentChatHandlerResult;
    logger?: Pick<Console, "log" | "error">;
};
export declare class PiAgentChatRequestError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare function normalizePiAgentChatRequest({ body, headers, agentId, surface, defaultAgentId, defaultSurface, supportedAgentIds, supportedSurfaces, metadata }?: NormalizePiAgentChatRequestInput): PiAgentChatRequest;
export declare function createPiAgentChatRouteHandler<TRequest = PiAgentChatRequest, TResult = PiAgentChatHandlerResult>(options: PiAgentChatRouteOptions<TRequest, TResult>): PiAgentChatRouteHandler;
export declare function startPiAgentChatServer<TRequest = PiAgentChatRequest, TResult = PiAgentChatHandlerResult>(options: PiAgentChatServerOptions<TRequest, TResult>): Server;
export declare function readPiAgentChatJson(req: IncomingMessage, maxBodyBytes?: number): Promise<unknown>;
export declare function sendPiAgentChatJson(res: ServerResponse, statusCode: number, body: unknown): void;
export type { JsonObject, JsonValue } from "../sharedTypes.js";
