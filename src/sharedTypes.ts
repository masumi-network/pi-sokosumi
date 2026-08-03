export type Awaitable<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue | undefined;
};

export type SokosumiLogger = Pick<Console, "log"> & Partial<Pick<Console, "warn" | "error">>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getProperty(source: unknown, key: string): unknown {
  return isRecord(source) ? source[key] : undefined;
}

export function getRecordProperty(source: unknown, key: string): Record<string, unknown> | undefined {
  const value = getProperty(source, key);
  return isRecord(value) ? value : undefined;
}

export function getPathValue(source: unknown, ...keys: string[]): unknown {
  let value = source;
  for (const key of keys) {
    value = getProperty(value, key);
    if (value === undefined) return undefined;
  }
  return value;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return String(error);
}
