import { isRecord } from "./sharedTypes.js";
export async function requestJson({ fetchImpl, url, timeoutMs, method = "GET", headers, body, createTimeoutError, createHttpError }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await fetchImpl(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });
    }
    catch (error) {
        if (isRecord(error) && error.name === "AbortError") {
            throw createTimeoutError(error);
        }
        throw error;
    }
    finally {
        clearTimeout(timeout);
    }
    const text = await response.text();
    const payload = text ? parseJson(text) : {};
    if (!response.ok) {
        throw createHttpError({ statusCode: response.status, payload });
    }
    return payload;
}
export function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return { raw: value };
    }
}
export function stripTrailingSlash(value) {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}
//# sourceMappingURL=jsonHttpTransport.js.map