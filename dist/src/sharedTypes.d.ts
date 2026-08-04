export type Awaitable<T> = T | Promise<T>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
    [key: string]: JsonValue | undefined;
};
export type SokosumiLogger = Pick<Console, "log"> & Partial<Pick<Console, "warn" | "error">>;
export type JsonValidationFailure = (message: string, payload: unknown) => never;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function createJsonValidators(fail: JsonValidationFailure): {
    expectRecord(value: unknown, label: string): Record<string, unknown>;
    expectArray(value: unknown, label: string): unknown[];
    expectString(value: unknown, label: string): string;
    expectNullableString(value: unknown, label: string): string | null;
    expectNumber(value: unknown, label: string): number;
    expectNullableNumber(value: unknown, label: string): number | null;
    expectBoolean(value: unknown, label: string): boolean;
    expectLiteral<const TValues extends readonly string[]>(value: unknown, values: TValues, label: string): TValues[number];
    expectNullableLiteral<const TValues extends readonly string[]>(value: unknown, values: TValues, label: string): TValues[number] | null;
};
export declare function getProperty(source: unknown, key: string): unknown;
export declare function getRecordProperty(source: unknown, key: string): Record<string, unknown> | undefined;
export declare function getPathValue(source: unknown, ...keys: string[]): unknown;
export declare function getErrorMessage(error: unknown): string;
export declare function firstText(...values: unknown[]): string | undefined;
export declare function normalizeText(value: unknown): string;
