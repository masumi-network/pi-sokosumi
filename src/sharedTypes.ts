export type Awaitable<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue | undefined;
};

export type SokosumiLogger = Pick<Console, "log"> & Partial<Pick<Console, "warn" | "error">>;

export type JsonValidationFailure = (message: string, payload: unknown) => never;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createJsonValidators(fail: JsonValidationFailure) {
  return {
    expectRecord(value: unknown, label: string): Record<string, unknown> {
      if (!isRecord(value)) fail(`${label} must be a JSON object.`, value);
      return value;
    },

    expectArray(value: unknown, label: string): unknown[] {
      if (!Array.isArray(value)) fail(`${label} must be an array.`, value);
      return value;
    },

    expectString(value: unknown, label: string): string {
      if (typeof value !== "string") fail(`${label} must be a string.`, value);
      return value;
    },

    expectNullableString(value: unknown, label: string): string | null {
      if (value !== null && typeof value !== "string") {
        fail(`${label} must be a string or null.`, value);
      }
      return value as string | null;
    },

    expectNumber(value: unknown, label: string): number {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(`${label} must be a finite number.`, value);
      }
      return value;
    },

    expectNullableNumber(value: unknown, label: string): number | null {
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
        fail(`${label} must be a finite number.`, value);
      }
      return value as number | null;
    },

    expectBoolean(value: unknown, label: string): boolean {
      if (typeof value !== "boolean") fail(`${label} must be a boolean.`, value);
      return value;
    },

    expectLiteral<const TValues extends readonly string[]>(
      value: unknown,
      values: TValues,
      label: string
    ): TValues[number] {
      if (!values.some((candidate) => candidate === value)) {
        fail(`${label} is not a supported value.`, value);
      }
      return value as TValues[number];
    },

    expectNullableLiteral<const TValues extends readonly string[]>(
      value: unknown,
      values: TValues,
      label: string
    ): TValues[number] | null {
      if (value === null) return null;
      if (!values.some((candidate) => candidate === value)) {
        fail(`${label} is not a supported value.`, value);
      }
      return value as TValues[number];
    }
  };
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

export function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function normalizeText(value: unknown): string {
  return String(value || "").trim();
}
