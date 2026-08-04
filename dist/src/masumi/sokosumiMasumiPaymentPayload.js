import { createJsonValidators } from "../sharedTypes.js";
import { MASUMI_NETWORKS, MasumiPaymentError } from "./masumiPaymentTypes.js";
const { expectLiteral, expectRecord } = createJsonValidators(throwInvalidResponse);
export function createSokosumiMasumiPaymentPayload(payment = {}) {
    const source = expectRecord(payment, "Masumi payment payload");
    const requestBody = source.requestBody === undefined
        ? {}
        : expectRecord(source.requestBody, "Masumi payment payload.requestBody");
    const smartContractWalletVkey = walletVkey(source.SmartContractWallet, "Masumi payment payload.SmartContractWallet");
    const sellerWalletVkey = walletVkey(source.SellerWallet, "Masumi payment payload.SellerWallet");
    const paymentSource = narrowPaymentSource(source.PaymentSource, requestBody.network);
    const id = narrowOptionalNonEmptyString(source.id, "Masumi payment payload.id");
    return {
        ...(id ? { id } : {}),
        blockchainIdentifier: narrowNonEmptyString(source.blockchainIdentifier, "Masumi payment payload.blockchainIdentifier"),
        agentIdentifier: narrowNonEmptyString(source.agentIdentifier ?? requestBody.agentIdentifier, "Masumi payment payload.agentIdentifier"),
        sellerVkey: narrowNonEmptyString(source.sellerVkey ?? smartContractWalletVkey ?? sellerWalletVkey, "Masumi payment payload.sellerVkey"),
        payByTime: narrowNonEmptyString(source.payByTime ?? requestBody.payByTime, "Masumi payment payload.payByTime"),
        submitResultTime: narrowNonEmptyString(source.submitResultTime ?? requestBody.submitResultTime, "Masumi payment payload.submitResultTime"),
        unlockTime: narrowNonEmptyString(source.unlockTime, "Masumi payment payload.unlockTime"),
        externalDisputeUnlockTime: narrowNonEmptyString(source.externalDisputeUnlockTime, "Masumi payment payload.externalDisputeUnlockTime"),
        inputHash: narrowNonEmptyString(source.inputHash ?? requestBody.inputHash, "Masumi payment payload.inputHash"),
        identifierFromPurchaser: narrowNonEmptyString(source.identifierFromPurchaser ?? requestBody.identifierFromPurchaser, "Masumi payment payload.identifierFromPurchaser"),
        Amounts: narrowAmounts(source.RequestedFunds ?? source.Amounts ?? requestBody.RequestedFunds, "Masumi payment payload.Amounts"),
        ...(paymentSource ? { PaymentSource: paymentSource } : {})
    };
}
function narrowAmounts(value, label) {
    if (!Array.isArray(value) || value.length === 0) {
        throwInvalidResponse(`${label} must be a non-empty array.`, value);
    }
    return value.map((amount, index) => {
        const source = expectRecord(amount, `${label}[${index}]`);
        return {
            amount: narrowNonEmptyString(source.amount, `${label}[${index}].amount`),
            unit: narrowNonEmptyString(source.unit, `${label}[${index}].unit`)
        };
    });
}
function narrowPaymentSource(value, fallbackNetwork) {
    if (value === undefined || value === null)
        return undefined;
    const source = expectRecord(value, "Masumi payment payload.PaymentSource");
    // Masumi permits a nullable policy id, while Sokosumi only accepts a complete
    // PaymentSource. The field is optional on Sokosumi, so omit an unmappable source.
    if (source.policyId === undefined || source.policyId === null)
        return undefined;
    return {
        network: expectLiteral(source.network ?? fallbackNetwork, MASUMI_NETWORKS, "Masumi payment payload.PaymentSource.network"),
        smartContractAddress: narrowNonEmptyString(source.smartContractAddress, "Masumi payment payload.PaymentSource.smartContractAddress"),
        policyId: narrowNonEmptyString(source.policyId, "Masumi payment payload.PaymentSource.policyId")
    };
}
function walletVkey(value, label) {
    if (value === undefined || value === null)
        return undefined;
    return expectRecord(value, label).walletVkey;
}
function narrowNonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throwInvalidResponse(`${label} must be a non-empty string.`, value);
    }
    return value;
}
function narrowOptionalNonEmptyString(value, label) {
    if (value === undefined || value === null)
        return undefined;
    return narrowNonEmptyString(value, label);
}
function throwInvalidResponse(message, payload) {
    throw new MasumiPaymentError(message, { code: "invalid_response", payload });
}
//# sourceMappingURL=sokosumiMasumiPaymentPayload.js.map