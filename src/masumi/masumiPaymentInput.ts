import { stripTrailingSlash } from "../jsonHttpTransport.js";
import { isRecord, normalizeText } from "../sharedTypes.js";
import {
  creditsToMasumiCostCents,
  creditsToMasumiRawUnits,
  masumiCentsToRawUnits,
  normalizeMasumiCostCents,
  normalizeMasumiRawUnits,
  usdToMasumiCostCents
} from "./masumiAmounts.js";
import {
  type MasumiAmount,
  type MasumiAmountInput,
  type MasumiCreatePaymentInput,
  type MasumiDateInput,
  type MasumiNetwork,
  MASUMI_PAYMENT_SOURCE_TYPES,
  type MasumiPaymentSourceSelection,
  type MasumiPaymentSourceType,
  type MasumiRequestedFundInput
} from "./masumiPaymentTypes.js";

export function normalizeMasumiNetwork(value: unknown): MasumiNetwork {
  const text = normalizeText(value);
  if (text.toLowerCase() === "mainnet") return "Mainnet";
  if (text.toLowerCase() === "preprod" || text.toLowerCase() === "preproduction") return "Preprod";
  throw new Error(`Unsupported Masumi network: ${value}`);
}

export function normalizeMasumiPaymentSourceSelection(
  paymentSourceType: unknown,
  supportedPaymentSourceIndex: unknown
): MasumiPaymentSourceSelection {
  const sourceType = normalizeOptionalMasumiPaymentSourceType(paymentSourceType);
  const sourceIndex = normalizeOptionalMasumiPaymentSourceIndex(supportedPaymentSourceIndex);

  if (sourceType === "Web3CardanoV1") {
    if (sourceIndex !== undefined) {
      throw new Error("Masumi Web3CardanoV1 payments must not set supportedPaymentSourceIndex.");
    }
    return { paymentSourceType: sourceType };
  }

  if (sourceType === "Web3CardanoV2") {
    if (sourceIndex === undefined) {
      throw new Error("Masumi Web3CardanoV2 payments require supportedPaymentSourceIndex.");
    }
    return {
      paymentSourceType: sourceType,
      supportedPaymentSourceIndex: sourceIndex
    };
  }

  return sourceIndex === undefined ? {} : { supportedPaymentSourceIndex: sourceIndex };
}

export function normalizeMasumiApiUrl(value: unknown): string {
  const text = stripTrailingSlash(normalizeText(value));
  if (!text) return "";

  try {
    const url = new URL(text);
    const path = stripTrailingSlash(url.pathname || "");
    if (!path || path === "/") {
      url.pathname = "/api/v1";
      return stripTrailingSlash(url.toString());
    }
    if (path === "/admin") {
      url.pathname = "/api/v1";
      return stripTrailingSlash(url.toString());
    }
    return stripTrailingSlash(url.toString());
  } catch {
    return text;
  }
}

export function resolveMasumiCostCents(input: MasumiCreatePaymentInput): bigint {
  if (input.costCents !== undefined && input.costCents !== null) return normalizeMasumiCostCents(input.costCents);
  if (input.credits !== undefined && input.credits !== null) return creditsToMasumiCostCents(input.credits);
  if (input.totalCostUsd !== undefined && input.totalCostUsd !== null) return usdToMasumiCostCents(input.totalCostUsd);
  if (input.totalCost !== undefined && input.totalCost !== null) return usdToMasumiCostCents(input.totalCost);
  return 1n;
}

export function resolveMasumiAmountRawUnits(
  input: MasumiCreatePaymentInput,
  costCents: bigint
): bigint {
  if (input.amountRawUnits !== undefined && input.amountRawUnits !== null) return normalizeMasumiRawUnits(input.amountRawUnits);
  if (input.rawAmount !== undefined && input.rawAmount !== null) return normalizeMasumiRawUnits(input.rawAmount);
  if (input.credits !== undefined && input.credits !== null) return creditsToMasumiRawUnits(input.credits);
  return masumiCentsToRawUnits(costCents);
}

export function normalizeRequestedFunds(
  value: MasumiRequestedFundInput[] | undefined,
  fallback: { amountRawUnits: bigint; unit: string }
): MasumiAmount[] {
  const funds = Array.isArray(value) && value.length
    ? value
    : [{ amount: fallback.amountRawUnits.toString(), unit: fallback.unit }];

  return funds.map((fund) => ({
    amount: normalizePositiveIntegerString(fund.amount, "RequestedFunds.amount"),
    unit: normalizeRequiredText(fund.unit, "RequestedFunds.unit")
  }));
}

export function normalizePaymentMetadata(
  value: string | Record<string, unknown> | undefined,
  fallback: Record<string, unknown> = {}
): string {
  if (typeof value === "string") return value;
  return JSON.stringify({
    ...fallback,
    ...(isRecord(value) ? value : {})
  });
}

export function normalizeHex(value: unknown, label: string): string {
  const text = normalizeRequiredText(value, label).toLowerCase();
  if (!/^[0-9a-f]+$/.test(text)) throw new Error(`Masumi ${label} must be hex.`);
  return text;
}

export function normalizeRequiredText(value: unknown, label: string): string {
  const text = normalizeText(value);
  if (!text) throw new Error(`Masumi requires ${label}.`);
  return text;
}

export function normalizePositiveInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function normalizeOptionalMasumiPaymentSourceType(value: unknown): MasumiPaymentSourceType | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const sourceType = MASUMI_PAYMENT_SOURCE_TYPES.find((candidate) => candidate === text);
  if (!sourceType) throw new Error(`Unsupported Masumi payment source type: ${value}`);
  return sourceType;
}

function normalizeOptionalMasumiPaymentSourceIndex(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index > 24) {
    throw new Error("Masumi supportedPaymentSourceIndex must be an integer between 0 and 24.");
  }
  return index;
}

export function toDate(value: MasumiDateInput, label: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Masumi ${label} must be a valid date.`);
  return date;
}

export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function normalizePositiveIntegerString(value: MasumiAmountInput, label: string): string {
  const text = normalizeRequiredText(value, label);
  try {
    if (BigInt(text) <= 0n) throw new Error("non-positive");
  } catch {
    throw new Error(`Masumi ${label} must be a positive integer string.`);
  }
  return text;
}
