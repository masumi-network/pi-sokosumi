import { randomBytes } from "node:crypto";
import { requestJson } from "../jsonHttpTransport.js";
import { createJsonValidators, isRecord } from "../sharedTypes.js";
import { MASUMI_DEFAULT_PAY_BY_MS, MASUMI_DEFAULT_SUBMIT_RESULT_MS, MASUMI_NETWORKS, MASUMI_ON_CHAIN_STATES, MASUMI_PAYMENT_ACTIONS, MASUMI_PAYMENT_ERROR_TYPES, MASUMI_PAYMENT_SOURCE_TYPES, MASUMI_PRICING_TYPES, MASUMI_TRANSACTION_STATUSES, MASUMI_USDM_UNITS, MasumiPaymentError } from "./masumiPaymentTypes.js";
import { addMs, normalizeHex, normalizeMasumiApiUrl, normalizeMasumiNetwork, normalizeOptionalMasumiPaymentSourceType, normalizeMasumiPaymentSourceSelection, normalizePaymentMetadata, normalizePositiveInteger, normalizeRequestedFunds, normalizeRequiredText, resolveMasumiAmountRawUnits, resolveMasumiCostCents, toDate } from "./masumiPaymentInput.js";
import { sha256Hex } from "./masumiSerialization.js";
export * from "./masumiPaymentTypes.js";
export * from "./masumiAmounts.js";
export * from "./masumiPaymentInput.js";
export * from "./masumiSerialization.js";
const { expectLiteral: assertLiteral, expectNullableLiteral: assertNullableLiteral, expectNullableNumber: assertNullableNumber, expectNullableString: assertNullableString, expectNumber: assertRequiredNumber, expectRecord, expectString: assertRequiredString } = createJsonValidators(throwInvalidResponse);
export function createMasumiPaymentClient({ apiUrl, apiToken, agentIdentifier, network = "Preprod", paymentUnit, paymentSourceType, supportedPaymentSourceIndex, fetchImpl = fetch, timeoutMs = 30000, now = () => new Date() } = {}) {
    const baseUrl = normalizeMasumiApiUrl(apiUrl);
    const normalizedNetwork = normalizeMasumiNetwork(network);
    const unit = normalizeRequiredText(paymentUnit || MASUMI_USDM_UNITS[normalizedNetwork], "paymentUnit");
    const configuredAgentIdentifier = normalizeRequiredText(agentIdentifier, "agentIdentifier");
    const configuredPaymentSource = normalizeMasumiPaymentSourceSelection(paymentSourceType, supportedPaymentSourceIndex);
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
            const inputOverridesPaymentSource = input.paymentSourceType !== undefined;
            const selectedPaymentSource = normalizeMasumiPaymentSourceSelection(input.paymentSourceType ?? configuredPaymentSource.paymentSourceType, inputOverridesPaymentSource
                ? input.supportedPaymentSourceIndex
                : input.supportedPaymentSourceIndex ?? configuredPaymentSource.supportedPaymentSourceIndex);
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
                RequestedFunds: requestedFunds,
                ...selectedPaymentSource
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
            const filterPaymentSourceType = normalizeOptionalMasumiPaymentSourceType(input.filterPaymentSourceType ?? (input.filterSmartContractAddress ? undefined : configuredPaymentSource.paymentSourceType));
            if (filterPaymentSourceType)
                search.set("filterPaymentSourceType", filterPaymentSourceType);
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
            return narrowPaymentDetails(expectSuccess(payload, "Masumi submit result"), "Masumi submit result data");
        }
    };
    async function request(path, requestOptions = {}) {
        if (!baseUrl) {
            throw new Error("Masumi payment API URL is required.");
        }
        if (!apiToken) {
            throw new Error("Masumi payment API token is required.");
        }
        return requestJson({
            fetchImpl,
            url: `${baseUrl}${path}`,
            timeoutMs,
            method: requestOptions.method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                token: apiToken
            },
            body: requestOptions.body,
            createTimeoutError: (error) => new MasumiPaymentError(`Masumi request timed out after ${timeoutMs}ms`, { code: "timeout", cause: error }),
            createHttpError: ({ statusCode, payload }) => {
                const source = isRecord(payload) ? payload : {};
                const message = typeof source.message === "string"
                    ? source.message
                    : typeof source.error === "string"
                        ? source.error
                        : `Masumi request failed with ${statusCode}`;
                return new MasumiPaymentError(`${message} (${statusCode})`, {
                    code: "http_error",
                    statusCode,
                    payload
                });
            }
        });
    }
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
function throwInvalidResponse(message, payload) {
    throw new MasumiPaymentError(message, { code: "invalid_response", payload });
}
//# sourceMappingURL=masumiPaymentClient.js.map