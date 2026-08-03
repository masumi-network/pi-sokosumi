export type Awaitable<T> = T | Promise<T>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
    [key: string]: JsonValue | undefined;
};
export type SokosumiLogger = Pick<Console, "log"> & Partial<Pick<Console, "warn" | "error">>;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function getProperty(source: unknown, key: string): unknown;
export declare function getRecordProperty(source: unknown, key: string): Record<string, unknown> | undefined;
export declare function getPathValue(source: unknown, ...keys: string[]): unknown;
export declare function getErrorMessage(error: unknown): string;
