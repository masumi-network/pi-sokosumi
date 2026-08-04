import { createHash } from "node:crypto";
import { isRecord } from "../sharedTypes.js";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  if (value instanceof Date) return value.toISOString();

  return Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}
