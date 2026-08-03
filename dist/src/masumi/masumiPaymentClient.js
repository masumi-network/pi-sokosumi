import { createHash, randomBytes } from "node:crypto";
import { isRecord } from "../sharedTypes.js";
export const MASUMI_NETWORKS = ["Preprod", "Mainnet"];
export const MASUMI_USDM_UNITS = Object.freeze({
    Preprod: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d",
    Mainnet: "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d"
});
export const MASUMI_CENT_RAW_UNITS = 10000n;
export const MASUMI_DEFAULT_PAY_BY_MS = 16 * 60 * 60 * 1000;
export const MASUMI_DEFAULT_SUBMIT_RESULT_MS = 17 * 60 * 60 * 1000;
export const MASUMI_PAYMENT_ACTIONS = [
    "None",
    "Ignore",
    "WaitingForManualAction",
    "WaitingForExternalAction",
    "SubmitResultRequested",
    "SubmitResultInitiated",
    "WithdrawRequested",
    "WithdrawInitiated",
    "AuthorizeRefundRequested",
    "AuthorizeRefundInitiated"
];
export const MASUMI_ON_CHAIN_STATES = [
    "FundsLocked",
    "FundsOrDatumInvalid",
    "ResultSubmitted",
    "RefundRequested",
    "Disputed",
    "WithdrawAuthorized",
    "RefundAuthorized",
    "Withdrawn",
    "RefundWithdrawn",
    "DisputedWithdrawn"
];
/** @deprecated Use MASUMI_ON_CHAIN_STATES. */
export const MASUMI_ESCROW_STATES = MASUMI_ON_CHAIN_STATES;
export const MASUMI_PAYMENT_ERROR_TYPES = ["NetworkError", "Unknown"];
export const MASUMI_PAYMENT_SOURCE_TYPES = ["Web3CardanoV1", "Web3CardanoV2"];
export const MASUMI_PRICING_TYPES = ["Fixed", "Free", "Dynamic"];
export const MASUMI_TRANSACTION_STATUSES = [
    "Pending",
    "Confirmed",
    "FailedViaTimeout",
    "FailedViaManualReset",
    "RolledBack"
];
export class MasumiPaymentError extends Error {
    code;
    statusCode;
    payload;
    constructor(message, options) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "MasumiPaymentError";
        this.code = options.code;
        this.statusCode = options.statusCode;
        this.payload = options.payload;
    }
}
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
        async createPayment(input) {
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
            const data = narrowPaymentDetails(expectSuccess(payload, "Masumi create payment"), "Masumi create payment data");
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
            return narrowPaymentList(expectSuccess(payload, "Masumi list payments"));
        },
        async submitResult(input) {
            const body = {
                network: normalizeMasumiNetwork(input.network || normalizedNetwork),
                blockchainIdentifier: normalizeRequiredText(input.blockchainIdentifier, "blockchainIdentifier"),
                submitResultHash: normalizeHex(input.submitResultHash || input.resultHash, "submitResultHash")
            };
            const payload = await request("/payment/submit-result", {
                method: "POST",
                body
            });
            return expectRecord(expectSuccess(payload, "Masumi submit result"), "Masumi submit result data");
        }
    };
    async function request(path, requestOptions = {}) {
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
                method: requestOptions.method || "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    token: apiToken
                },
                body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
                signal: controller.signal
            });
        }
        catch (error) {
            if (isRecord(error) && error.name === "AbortError") {
                throw new MasumiPaymentError(`Masumi request timed out after ${timeoutMs}ms`, {
                    code: "timeout",
                    cause: error
                });
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
        const text = await response.text();
        const payload = text ? parseJson(text) : {};
        if (!response.ok) {
            const source = isRecord(payload) ? payload : {};
            const message = typeof source.message === "string"
                ? source.message
                : typeof source.error === "string"
                    ? source.error
                    : `Masumi request failed with ${response.status}`;
            throw new MasumiPaymentError(`${message} (${response.status})`, {
                code: "http_error",
                statusCode: response.status,
                payload
            });
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
function resolveMasumiCostCents(input) {
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
function resolveMasumiAmountRawUnits(input, costCents) {
    if (input.amountRawUnits !== undefined && input.amountRawUnits !== null)
        return normalizeMasumiRawUnits(input.amountRawUnits);
    if (input.rawAmount !== undefined && input.rawAmount !== null)
        return normalizeMasumiRawUnits(input.rawAmount);
    if (input.credits !== undefined && input.credits !== null)
        return creditsToMasumiRawUnits(input.credits);
    return masumiCentsToRawUnits(costCents);
}
function normalizeRequestedFunds(value, fallback) {
    const funds = Array.isArray(value) && value.length
        ? value
        : [{ amount: fallback.amountRawUnits.toString(), unit: fallback.unit }];
    return funds.map((fund) => ({
        amount: normalizePositiveIntegerString(fund.amount, "RequestedFunds.amount"),
        unit: normalizeRequiredText(fund.unit, "RequestedFunds.unit")
    }));
}
function normalizeAmounts(value) {
    return value.map((amount) => ({
        amount: String(amount?.amount || ""),
        unit: String(amount?.unit || "")
    }));
}
function normalizePaymentMetadata(value, fallback = {}) {
    if (typeof value === "string")
        return value;
    return JSON.stringify({
        ...fallback,
        ...(isRecord(value) ? value : {})
    });
}
function expectSuccess(payload, label) {
    if (!isRecord(payload))
        return payload;
    if (payload.status && payload.status !== "success") {
        const detail = payload.message || payload.error || payload.status;
        throw new Error(`${label} failed: ${String(detail)}`);
    }
    return payload.data ?? payload;
}
function narrowPaymentDetails(value, label) {
    const payment = expectRecord(value, label);
    for (const key of [
        "id",
        "createdAt",
        "updatedAt",
        "blockchainIdentifier",
        "submitResultTime",
        "unlockTime",
        "externalDisputeUnlockTime",
        "requestedById",
        "nextActionLastChangedAt",
        "onChainStateOrResultLastChangedAt",
        "nextActionOrOnChainStateOrResultLastChangedAt"
    ]) {
        assertRequiredString(payment[key], `${label}.${key}`);
    }
    for (const key of [
        "agentIdentifier",
        "agentName",
        "lastCheckedAt",
        "payByTime",
        "collateralReturnLovelace",
        "buyerReturnAddress",
        "sellerReturnAddress",
        "resultHash",
        "inputHash",
        "metadata"
    ]) {
        assertNullableString(payment[key], `${label}.${key}`);
    }
    assertLiteral(payment.pricingType, MASUMI_PRICING_TYPES, `${label}.pricingType`);
    for (const key of [
        "totalBuyerCardanoFees",
        "totalSellerCardanoFees",
        "cooldownTime",
        "cooldownTimeOtherParty"
    ]) {
        assertRequiredNumber(payment[key], `${label}.${key}`);
    }
    assertNullableLiteral(payment.onChainState, MASUMI_ON_CHAIN_STATES, `${label}.onChainState`);
    payment.NextAction = narrowNextAction(payment.NextAction, `${label}.NextAction`);
    payment.CurrentTransaction = narrowNullableTransaction(payment.CurrentTransaction, `${label}.CurrentTransaction`);
    payment.RequestedFunds = narrowAmounts(payment.RequestedFunds, `${label}.RequestedFunds`);
    payment.WithdrawnForSeller = narrowAmounts(payment.WithdrawnForSeller, `${label}.WithdrawnForSeller`);
    payment.WithdrawnForBuyer = narrowAmounts(payment.WithdrawnForBuyer, `${label}.WithdrawnForBuyer`);
    payment.PaymentSource = narrowPaymentSource(payment.PaymentSource, `${label}.PaymentSource`);
    payment.BuyerWallet = narrowNullableBuyerWallet(payment.BuyerWallet, `${label}.BuyerWallet`);
    payment.SmartContractWallet = narrowNullableWallet(payment.SmartContractWallet, `${label}.SmartContractWallet`);
    return payment;
}
function narrowPayment(value, label) {
    const payment = narrowPaymentDetails(value, label);
    payment.ActionHistory = narrowNullableActionHistory(payment.ActionHistory, `${label}.ActionHistory`);
    payment.TransactionHistory = narrowNullableTransactionHistory(payment.TransactionHistory, `${label}.TransactionHistory`);
    return payment;
}
function narrowPaymentList(value) {
    if (Array.isArray(value)) {
        return value.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
    }
    const page = expectRecord(value, "Masumi payment list data");
    if (!Array.isArray(page.Payments)) {
        throwInvalidResponse("Masumi payment list Payments must be an array.", page.Payments);
    }
    page.Payments = page.Payments.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
    return page;
}
function narrowAmounts(value, label) {
    if (!Array.isArray(value))
        throwInvalidResponse(`${label} must be an array.`, value);
    return value.map((entry, index) => {
        const amount = expectRecord(entry, `${label}[${index}]`);
        if (typeof amount.amount !== "string" || typeof amount.unit !== "string") {
            throwInvalidResponse(`${label}[${index}] must contain string amount and unit fields.`, entry);
        }
        return { amount: amount.amount, unit: amount.unit };
    });
}
function narrowPaymentSource(value, label) {
    const source = expectRecord(value, label);
    assertRequiredString(source.id, `${label}.id`);
    assertLiteral(source.network, MASUMI_NETWORKS, `${label}.network`);
    assertLiteral(source.paymentSourceType, MASUMI_PAYMENT_SOURCE_TYPES, `${label}.paymentSourceType`);
    assertRequiredString(source.smartContractAddress, `${label}.smartContractAddress`);
    assertNullableString(source.policyId, `${label}.policyId`);
    return source;
}
function narrowBuyerWallet(value, label) {
    const wallet = expectRecord(value, label);
    assertRequiredString(wallet.id, `${label}.id`);
    assertRequiredString(wallet.walletVkey, `${label}.walletVkey`);
    return wallet;
}
function narrowWallet(value, label) {
    const wallet = narrowBuyerWallet(value, label);
    assertRequiredString(wallet.walletAddress, `${label}.walletAddress`);
    return wallet;
}
function narrowNextAction(value, label) {
    const action = expectRecord(value, label);
    assertLiteral(action.requestedAction, MASUMI_PAYMENT_ACTIONS, `${label}.requestedAction`);
    assertNullableLiteral(action.errorType, MASUMI_PAYMENT_ERROR_TYPES, `${label}.errorType`);
    assertNullableString(action.errorNote, `${label}.errorNote`);
    assertNullableString(action.resultHash, `${label}.resultHash`);
    return action;
}
function narrowNullableBuyerWallet(value, label) {
    return value === null ? null : narrowBuyerWallet(value, label);
}
function narrowNullableWallet(value, label) {
    return value === null ? null : narrowWallet(value, label);
}
function narrowTransaction(value, label) {
    const transaction = expectRecord(value, label);
    for (const key of ["id", "createdAt", "updatedAt"]) {
        assertRequiredString(transaction[key], `${label}.${key}`);
    }
    for (const key of ["fees", "txHash"]) {
        assertNullableString(transaction[key], `${label}.${key}`);
    }
    for (const key of ["blockHeight", "blockTime", "confirmations"]) {
        assertNullableNumber(transaction[key], `${label}.${key}`);
    }
    assertLiteral(transaction.status, MASUMI_TRANSACTION_STATUSES, `${label}.status`);
    assertNullableLiteral(transaction.previousOnChainState, MASUMI_ON_CHAIN_STATES, `${label}.previousOnChainState`);
    assertNullableLiteral(transaction.newOnChainState, MASUMI_ON_CHAIN_STATES, `${label}.newOnChainState`);
    return transaction;
}
function narrowNullableTransaction(value, label) {
    return value === null ? null : narrowTransaction(value, label);
}
function narrowNullableActionHistory(value, label) {
    if (value === null)
        return null;
    if (!Array.isArray(value))
        throwInvalidResponse(`${label} must be an array or null.`, value);
    return value.map((entry, index) => {
        const entryLabel = `${label}[${index}]`;
        const action = narrowNextAction(entry, entryLabel);
        assertRequiredString(action.id, `${entryLabel}.id`);
        assertRequiredString(action.createdAt, `${entryLabel}.createdAt`);
        assertRequiredString(action.updatedAt, `${entryLabel}.updatedAt`);
        assertNullableString(action.submittedTxHash, `${entryLabel}.submittedTxHash`);
        return action;
    });
}
function narrowNullableTransactionHistory(value, label) {
    if (value === null)
        return null;
    if (!Array.isArray(value))
        throwInvalidResponse(`${label} must be an array or null.`, value);
    return value.map((entry, index) => narrowTransaction(entry, `${label}[${index}]`));
}
function expectRecord(value, label) {
    if (!isRecord(value))
        throwInvalidResponse(`${label} must be a JSON object.`, value);
    return value;
}
function assertRequiredString(value, label) {
    if (typeof value !== "string")
        throwInvalidResponse(`${label} must be a string.`, value);
}
function assertNullableString(value, label) {
    if (value !== null && typeof value !== "string") {
        throwInvalidResponse(`${label} must be a string or null.`, value);
    }
}
function assertRequiredNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throwInvalidResponse(`${label} must be a finite number.`, value);
    }
}
function assertNullableNumber(value, label) {
    if (value !== null)
        assertRequiredNumber(value, label);
}
function assertLiteral(value, values, label) {
    if (!values.some((candidate) => candidate === value)) {
        throwInvalidResponse(`${label} is not a supported value.`, value);
    }
}
function assertNullableLiteral(value, values, label) {
    if (value !== null)
        assertLiteral(value, values, label);
}
function throwInvalidResponse(message, payload) {
    throw new MasumiPaymentError(message, { code: "invalid_response", payload });
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
    if (!isRecord(value))
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