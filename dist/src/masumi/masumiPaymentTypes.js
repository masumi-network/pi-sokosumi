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
//# sourceMappingURL=masumiPaymentTypes.js.map