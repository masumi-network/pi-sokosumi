import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "node:http";
export type PiAgentChatRequest = {
    agentId?: string;
    surface: string;
    userId: string;
    organizationId?: string;
    message: string;
    attachments?: unknown[];
    metadata?: Record<string, unknown>;
};
export type PiAgentChatHandlerResult = Record<string, unknown> | unknown;
export type NormalizePiAgentChatRequestInput = {
    body?: any;
    headers?: IncomingHttpHeaders;
    agentId?: unknown;
    surface?: unknown;
    defaultAgentId?: string;
    defaultSurface?: string;
    supportedAgentIds?: readonly string[];
    supportedSurfaces?: readonly string[] | Record<string, readonly string[]>;
    metadata?: Record<string, unknown>;
};
export type PiAgentChatRouteHandlerInput = {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
};
export type PiAgentChatRouteOptions<TRequest = PiAgentChatRequest> = {
    path?: string;
    maxBodyBytes?: number;
    defaultAgentId?: string;
    defaultSurface?: string;
    supportedAgentIds?: readonly string[];
    supportedSurfaces?: readonly string[] | Record<string, readonly string[]>;
    authorize?: (input: {
        req: IncomingMessage;
        res: ServerResponse;
        headers: IncomingHttpHeaders;
    }) => void | Promise<void>;
    rateLimit?: (input: {
        req: IncomingMessage;
        res: ServerResponse;
        headers: IncomingHttpHeaders;
    }) => void | Promise<void>;
    normalizeRequest?: (input: {
        body: any;
        headers: IncomingHttpHeaders;
        req: IncomingMessage;
    }) => TRequest | Promise<TRequest>;
    handleChat: (input: {
        request: TRequest;
        body: any;
        headers: IncomingHttpHeaders;
        req: IncomingMessage;
    }) => PiAgentChatHandlerResult | Promise<PiAgentChatHandlerResult>;
    onError?: (input: {
        error: any;
        req: IncomingMessage;
        res: ServerResponse;
        body?: any;
    }) => void | Promise<void>;
};
export type PiAgentChatServerOptions<TRequest = PiAgentChatRequest> = PiAgentChatRouteOptions<TRequest> & {
    port?: number;
    host?: string;
    healthPath?: string;
    healthResponse?: () => unknown;
    logger?: Pick<Console, "log" | "error">;
};
export declare class PiAgentChatRequestError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare function normalizePiAgentChatRequest({ body, headers, agentId, surface, defaultAgentId, defaultSurface, supportedAgentIds, supportedSurfaces, metadata }?: NormalizePiAgentChatRequestInput): PiAgentChatRequest;
export declare function createPiAgentChatRouteHandler<TRequest = PiAgentChatRequest>(options: PiAgentChatRouteOptions<TRequest>): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
export declare function startPiAgentChatServer<TRequest = PiAgentChatRequest>(options: PiAgentChatServerOptions<TRequest>): Server;
export declare function readPiAgentChatJson(req: IncomingMessage, maxBodyBytes?: number): Promise<any>;
export declare function sendPiAgentChatJson(res: ServerResponse, statusCode: number, body: unknown): void;
