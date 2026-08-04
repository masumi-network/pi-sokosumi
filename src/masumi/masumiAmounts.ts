import { normalizeText } from "../sharedTypes.js";
import {
  MASUMI_CENT_RAW_UNITS,
  type MasumiAmountInput
} from "./masumiPaymentTypes.js";

export function usdToMasumiCostCents(value: number | string): bigint {
  const usd = Number(value);
  if (!Number.isFinite(usd) || usd <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(usd * 100)));
}

export function creditsToMasumiCostCents(value: MasumiAmountInput): bigint {
  return normalizeMasumiCostCents(value);
}

export function creditsToMasumiRawUnits(value: MasumiAmountInput): bigint {
  return decimalToScaledCeil(value, MASUMI_CENT_RAW_UNITS);
}

export function normalizeMasumiRawUnits(value: MasumiAmountInput): bigint {
  if (typeof value === "bigint") return value > 0n ? value : 1n;
  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    const bigint = BigInt(value.trim());
    return bigint > 0n ? bigint : 1n;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(number)));
}

export function normalizeMasumiCostCents(value: MasumiAmountInput): bigint {
  if (typeof value === "bigint") return value > 0n ? value : 1n;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(number)));
}

export function masumiCentsToRawUnits(costCents: MasumiAmountInput): bigint {
  return normalizeMasumiCostCents(costCents) * MASUMI_CENT_RAW_UNITS;
}

function decimalToScaledCeil(value: MasumiAmountInput, scale: bigint): bigint {
  if (typeof value === "bigint") return value > 0n ? value * scale : 1n;

  const text = normalizeText(value);
  if (!text) return 1n;
  if (text.startsWith("-")) return 1n;

  const normalized = text.startsWith("+") ? text.slice(1) : text;
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 1n;
    return BigInt(Math.max(1, Math.ceil(number * Number(scale))));
  }

  const [, wholePart, fractionPart = ""] = match;
  const scaleDigits = scale.toString().length - 1;
  const scaledFraction = fractionPart.slice(0, scaleDigits).padEnd(scaleDigits, "0");
  const remainder = fractionPart.slice(scaleDigits);
  let amount = BigInt(wholePart || "0") * scale + BigInt(scaledFraction || "0");
  if (remainder && /[1-9]/.test(remainder)) amount += 1n;
  return amount > 0n ? amount : 1n;
}
