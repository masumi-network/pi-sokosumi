export type Awaitable<T> = T | Promise<T>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
    [key: string]: JsonValue | undefined;
};
export type SokosumiLogger = Pick<Console, "log"> & Partial<Pick<Console, "warn" | "error">>;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function getErrorMessage(error: unknown): string;
