export type JsonFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;
export type JsonHttpFailure = {
    statusCode: number;
    payload: unknown;
};
export type JsonHttpRequestOptions = {
    fetchImpl: JsonFetch;
    url: string;
    timeoutMs: number;
    method?: "GET" | "PATCH" | "POST";
    headers: Record<string, string>;
    body?: Record<string, unknown>;
    createTimeoutError(error: unknown): Error;
    createHttpError(failure: JsonHttpFailure): Error;
};
export declare function requestJson({ fetchImpl, url, timeoutMs, method, headers, body, createTimeoutError, createHttpError }: JsonHttpRequestOptions): Promise<unknown>;
export declare function parseJson(value: string): unknown;
export declare function stripTrailingSlash(value: string): string;
