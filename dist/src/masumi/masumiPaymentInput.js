import { stripTrailingSlash } from "../jsonHttpTransport.js";
import { isRecord, normalizeText } from "../sharedTypes.js";
import { creditsToMasumiCostCents, creditsToMasumiRawUnits, masumiCentsToRawUnits, normalizeMasumiCostCents, normalizeMasumiRawUnits, usdToMasumiCostCents } from "./masumiAmounts.js";
export function normalizeMasumiNetwork(value) {
    const text = normalizeText(value);
    if (text.toLowerCase() === "mainnet")
        return "Mainnet";
    if (text.toLowerCase() === "preprod" || text.toLowerCase() === "preproduction")
        return "Preprod";
    throw new Error(`Unsupported Masumi network: ${value}`);
}
export function normalizeMasumiApiUrl(value) {
    const text = stripTrailingSlash(normalizeText(value));
    if (!text)
        return "";
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
    }
    catch {
        return text;
    }
}
export function resolveMasumiCostCents(input) {
    if (input.costCents !== undefined && input.costCents !== null)
        return normalizeMasumiCostCents(input.costCents);
    if (input.credits !== undefined && input.credits !== null)
        return creditsToMasumiCostCents(input.credits);
    if (input.totalCostUsd !== undefined && input.totalCostUsd !== null)
        return usdToMasumiCostCents(input.totalCostUsd);
    if (input.totalCost !== undefined && input.totalCost !== null)
        return usdToMasumiCostCents(input.totalCost);
    return 1n;
}
export function resolveMasumiAmountRawUnits(input, costCents) {
    if (input.amountRawUnits !== undefined && input.amountRawUnits !== null)
        return normalizeMasumiRawUnits(input.amountRawUnits);
    if (input.rawAmount !== undefined && input.rawAmount !== null)
        return normalizeMasumiRawUnits(input.rawAmount);
    if (input.credits !== undefined && input.credits !== null)
        return creditsToMasumiRawUnits(input.credits);
    return masumiCentsToRawUnits(costCents);
}
export function normalizeRequestedFunds(value, fallback) {
    const funds = Array.isArray(value) && value.length
        ? value
        : [{ amount: fallback.amountRawUnits.toString(), unit: fallback.unit }];
    return funds.map((fund) => ({
        amount: normalizePositiveIntegerString(fund.amount, "RequestedFunds.amount"),
        unit: normalizeRequiredText(fund.unit, "RequestedFunds.unit")
    }));
}
export function normalizePaymentMetadata(value, fallback = {}) {
    if (typeof value === "string")
        return value;
    return JSON.stringify({
        ...fallback,
        ...(isRecord(value) ? value : {})
    });
}
export function normalizeHex(value, label) {
    const text = normalizeRequiredText(value, label).toLowerCase();
    if (!/^[0-9a-f]+$/.test(text))
        throw new Error(`Masumi ${label} must be hex.`);
    return text;
}
export function normalizeRequiredText(value, label) {
    const text = normalizeText(value);
    if (!text)
        throw new Error(`Masumi requires ${label}.`);
    return text;
}
export function normalizePositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
}
export function toDate(value, label) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error(`Masumi ${label} must be a valid date.`);
    return date;
}
export function addMs(date, ms) {
    return new Date(date.getTime() + ms);
}
function normalizePositiveIntegerString(value, label) {
    const text = normalizeRequiredText(value, label);
    try {
        if (BigInt(text) <= 0n)
            throw new Error("non-positive");
    }
    catch {
        throw new Error(`Masumi ${label} must be a positive integer string.`);
    }
    return text;
}
//# sourceMappingURL=masumiPaymentInput.js.map