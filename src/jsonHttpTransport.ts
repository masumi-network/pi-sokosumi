import { isRecord } from "./sharedTypes.js";

export type JsonFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Pick<Response, "ok" | "status" | "text">>;

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

export async function requestJson({
  fetchImpl,
  url,
  timeoutMs,
  method = "GET",
  headers,
  body,
  createTimeoutError,
  createHttpError
}: JsonHttpRequestOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Pick<Response, "ok" | "status" | "text">;

  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    if (isRecord(error) && error.name === "AbortError") {
      throw createTimeoutError(error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  const payload = text ? parseJson(text) : {};
  if (!response.ok) {
    throw createHttpError({ statusCode: response.status, payload });
  }
  return payload;
}

export function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { raw: value };
  }
}

export function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
