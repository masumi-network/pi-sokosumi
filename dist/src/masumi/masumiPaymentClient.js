// @ts-nocheck
import { createHash, randomBytes } from "node:crypto";
export const MASUMI_NETWORKS = ["Preprod", "Mainnet"];
export const MASUMI_USDM_UNITS = Object.freeze({
    Preprod: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d",
    Mainnet: "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d"
});
export const MASUMI_CENT_RAW_UNITS = 10000n;
export const MASUMI_DEFAULT_PAY_BY_MS = 16 * 60 * 60 * 1000;
export const MASUMI_DEFAULT_SUBMIT_RESULT_MS = 17 * 60 * 60 * 1000;
export function createMasumiPaymentClient({ apiUrl, apiToken, agentIdentifier, network = "Preprod", paymentUnit, fetchImpl = fetch, timeoutMs = 30000, now = () => new Date() } = {}) {
    const baseUrl = normalizeMasumiApiUrl(apiUrl);
    const normalizedNetwork = normalizeMasumiNetwork(network);
    const unit = normalizeRequiredText(paymentUnit || MASUMI_USDM_UNITS[normalizedNetwork], "paymentUnit");
    const configuredAgentIdentifier = normalizeRequiredText(agentIdentifier, "agentIdentifier");
    return {
        apiUrl: baseUrl,
        agentIdentifier: configuredAgentIdentifier,
        network: normalizedNetwork,
        paymentUnit: unit,
        async createPayment(input = {}) {
            const taskId = normalizeRequiredText(input.taskId, "taskId");
            const costCents = resolveMasumiCostCents(input);
            const amountRawUnits = resolveMasumiAmountRawUnits(input, costCents);
            const currentNow = toDate(now(), "now");
            const payByTime = toDate(input.payByTime || addMs(currentNow, MASUMI_DEFAULT_PAY_BY_MS), "payByTime");
            const submitResultTime = toDate(input.submitResultTime || addMs(currentNow, MASUMI_DEFAULT_SUBMIT_RESULT_MS), "submitResultTime");
            const requestedFunds = normalizeRequestedFunds(input.RequestedFunds || input.requestedFunds, {
                amountRawUnits,
                unit
            });
            const body = {
                agentIdentifier: normalizeRequiredText(input.agentIdentifier || configuredAgentIdentifier, "agentIdentifier"),
                network: normalizeMasumiNetwork(input.network || normalizedNetwork),
                inputHash: normalizeHex(input.inputHash || sha256Hex(taskId), "inputHash"),
                payByTime: payByTime.toISOString(),
                submitResultTime: submitResultTime.toISOString(),
                metadata: normalizePaymentMetadata(input.metadata, {
                    taskId,
                    credits: input.credits !== undefined && input.credits !== null ? Number(input.credits) : Number(costCents),
                    amountRawUnits: amountRawUnits.toString()
                }),
                identifierFromPurchaser: normalizeHex(input.identifierFromPurchaser || randomBytes(8).toString("hex"), "identifierFromPurchaser"),
                RequestedFunds: requestedFunds
            };
            const payload = await request("/payment", {
                method: "POST",
                body
            });
            const data = expectSuccess(payload, "Masumi create payment");
            return {
                ...data,
                requestBody: body,
                costCents: costCents.toString(),
                amountRawUnits: amountRawUnits.toString()
            };
        },
        async listPayments(input = {}) {
            const search = new URLSearchParams();
            search.set("network", normalizeMasumiNetwork(input.network || normalizedNetwork));
            search.set("limit", String(normalizePositiveInteger(input.limit, 100)));
            if (input.cursorId)
                search.set("cursorId", String(input.cursorId));
            if (input.filterSmartContractAddress)
                search.set("filterSmartContractAddress", String(input.filterSmartContractAddress));
            if (input.includeHistory !== undefined)
                search.set("includeHistory", input.includeHistory ? "true" : "false");
            const payload = await request(`/payment?${search.toString()}`);
            return expectSuccess(payload, "Masumi list payments");
        },
        async submitResult(input = {}) {
            const body = {
                network: normalizeMasumiNetwork(input.network || normalizedNetwork),
                blockchainIdentifier: normalizeRequiredText(input.blockchainIdentifier, "blockchainIdentifier"),
                submitResultHash: normalizeHex(input.submitResultHash || input.resultHash, "submitResultHash")
            };
            const payload = await request("/payment/submit-result", {
                method: "POST",
                body
            });
            return expectSuccess(payload, "Masumi submit result");
        }
    };
    async function request(path, options = {}) {
        if (!baseUrl) {
            throw new Error("Masumi payment API URL is required.");
        }
        if (!apiToken) {
            throw new Error("Masumi payment API token is required.");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            response = await fetchImpl(`${baseUrl}${path}`, {
                method: options.method || "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    token: apiToken
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal
            });
        }
        catch (error) {
            if (error?.name === "AbortError") {
                throw new Error(`Masumi request timed out after ${timeoutMs}ms`);
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
        const text = await response.text();
        const payload = text ? parseJson(text) : {};
        if (!response.ok) {
            const message = payload?.message || payload?.error || `Masumi request failed with ${response.status}`;
            throw new Error(`${message} (${response.status})`);
        }
        return payload;
    }
}
export function createSokosumiMasumiPaymentPayload(payment = {}) {
    const requestBody = payment.requestBody || {};
    const paymentSource = payment.PaymentSource || {};
    return {
        id: payment.id || "",
        blockchainIdentifier: payment.blockchainIdentifier || "",
        agentIdentifier: payment.agentIdentifier || requestBody.agentIdentifier || "",
        sellerVkey: payment.SmartContractWallet?.walletVkey ?? payment.SellerWallet?.walletVkey ?? null,
        payByTime: payment.payByTime || requestBody.payByTime || "",
        submitResultTime: payment.submitResultTime || requestBody.submitResultTime || "",
        unlockTime: payment.unlockTime || "",
        externalDisputeUnlockTime: payment.externalDisputeUnlockTime || "",
        inputHash: payment.inputHash || requestBody.inputHash || "",
        identifierFromPurchaser: payment.identifierFromPurchaser || requestBody.identifierFromPurchaser || "",
        Amounts: normalizeAmounts(payment.RequestedFunds || payment.Amounts || requestBody.RequestedFunds || []),
        PaymentSource: {
            network: paymentSource.network || requestBody.network || "",
            smartContractAddress: paymentSource.smartContractAddress || "",
            policyId: paymentSource.policyId ?? null
        }
    };
}
export function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}
export function sha256Hex(value) {
    return createHash("sha256")
        .update(String(value))
        .digest("hex");
}
export function usdToMasumiCostCents(value) {
    const usd = Number(value);
    if (!Number.isFinite(usd) || usd <= 0)
        return 1n;
    return BigInt(Math.max(1, Math.ceil(usd * 100)));
}
export function creditsToMasumiCostCents(value) {
    return normalizeMasumiCostCents(value);
}
export function creditsToMasumiRawUnits(value) {
    return decimalToScaledCeil(value, MASUMI_CENT_RAW_UNITS);
}
export function normalizeMasumiRawUnits(value) {
    if (typeof value === "bigint")
        return value > 0n ? value : 1n;
    if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
        const bigint = BigInt(value.trim());
        return bigint > 0n ? bigint : 1n;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0)
        return 1n;
    return BigInt(Math.max(1, Math.ceil(number)));
}
export function normalizeMasumiCostCents(value) {
    if (typeof value === "bigint")
        return value > 0n ? value : 1n;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0)
        return 1n;
    return BigInt(Math.max(1, Math.ceil(number)));
}
export function masumiCentsToRawUnits(costCents) {
    return normalizeMasumiCostCents(costCents) * MASUMI_CENT_RAW_UNITS;
}
export function normalizeMasumiNetwork(value) {
    const text = String(value || "").trim();
    if (text.toLowerCase() === "mainnet")
        return "Mainnet";
    if (text.toLowerCase() === "preprod" || text.toLowerCase() === "preproduction")
        return "Preprod";
    throw new Error(`Unsupported Masumi network: ${value}`);
}
export function normalizeMasumiApiUrl(value) {
    const text = stripTrailingSlash(String(value || "").trim());
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
function resolveMasumiCostCents(input = {}) {
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
function resolveMasumiAmountRawUnits(input = {}, costCents) {
    if (input.amountRawUnits !== undefined && input.amountRawUnits !== null)
        return normalizeMasumiRawUnits(input.amountRawUnits);
    if (input.rawAmount !== undefined && input.rawAmount !== null)
        return normalizeMasumiRawUnits(input.rawAmount);
    if (input.credits !== undefined && input.credits !== null)
        return creditsToMasumiRawUnits(input.credits);
    return masumiCentsToRawUnits(costCents);
}
function normalizeRequestedFunds(value, { amountRawUnits, unit }) {
    const funds = Array.isArray(value) && value.length
        ? value
        : [{ amount: amountRawUnits.toString(), unit }];
    return funds.map((fund) => ({
        amount: normalizePositiveIntegerString(fund.amount, "RequestedFunds.amount"),
        unit: normalizeRequiredText(fund.unit, "RequestedFunds.unit")
    }));
}
function normalizeAmounts(value) {
    return (Array.isArray(value) ? value : []).map((amount) => ({
        amount: String(amount?.amount || ""),
        unit: String(amount?.unit || "")
    }));
}
function normalizePaymentMetadata(value, fallback = {}) {
    if (typeof value === "string")
        return value;
    return JSON.stringify({
        ...fallback,
        ...(value && typeof value === "object" ? value : {})
    });
}
function expectSuccess(payload, label) {
    if (payload?.status && payload.status !== "success") {
        throw new Error(`${label} failed: ${payload.message || payload.error || payload.status}`);
    }
    return payload?.data ?? payload;
}
function normalizeHex(value, label) {
    const text = normalizeRequiredText(value, label).toLowerCase();
    if (!/^[0-9a-f]+$/.test(text))
        throw new Error(`Masumi ${label} must be hex.`);
    return text;
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
function normalizeRequiredText(value, label) {
    const text = String(value || "").trim();
    if (!text)
        throw new Error(`Masumi requires ${label}.`);
    return text;
}
function normalizePositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
}
function decimalToScaledCeil(value, scale) {
    if (typeof value === "bigint")
        return value > 0n ? value * scale : 1n;
    const text = String(value || "").trim();
    if (!text)
        return 1n;
    if (text.startsWith("-"))
        return 1n;
    const normalized = text.startsWith("+") ? text.slice(1) : text;
    const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0)
            return 1n;
        return BigInt(Math.max(1, Math.ceil(number * Number(scale))));
    }
    const [, wholePart, fractionPart = ""] = match;
    const scaleDigits = scale.toString().length - 1;
    const scaledFraction = fractionPart.slice(0, scaleDigits).padEnd(scaleDigits, "0");
    const remainder = fractionPart.slice(scaleDigits);
    let amount = BigInt(wholePart || "0") * scale + BigInt(scaledFraction || "0");
    if (remainder && /[1-9]/.test(remainder))
        amount += 1n;
    return amount > 0n ? amount : 1n;
}
function toDate(value, label) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error(`Masumi ${label} must be a valid date.`);
    return date;
}
function addMs(date, ms) {
    return new Date(date.getTime() + ms);
}
function canonicalize(value) {
    if (Array.isArray(value))
        return value.map(canonicalize);
    if (!value || typeof value !== "object")
        return value;
    if (value instanceof Date)
        return value.toISOString();
    return Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
    }, {});
}
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return { raw: value };
    }
}
function stripTrailingSlash(value) {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}
//# sourceMappingURL=masumiPaymentClient.js.map