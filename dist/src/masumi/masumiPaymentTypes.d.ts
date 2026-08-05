import type { JsonFetch } from "../jsonHttpTransport.js";
export declare const MASUMI_NETWORKS: readonly ["Preprod", "Mainnet"];
export type MasumiNetwork = typeof MASUMI_NETWORKS[number];
export type MasumiNetworkInput = MasumiNetwork | "preprod" | "mainnet" | "preproduction" | "Preproduction";
export declare const MASUMI_USDM_UNITS: Readonly<{
    Preprod: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d";
    Mainnet: "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d";
}>;
export declare const MASUMI_CENT_RAW_UNITS = 10000n;
export declare const MASUMI_DEFAULT_PAY_BY_MS: number;
export declare const MASUMI_DEFAULT_SUBMIT_RESULT_MS: number;
export type MasumiAmountInput = number | string | bigint;
export type MasumiDateInput = Date | string | number;
export type MasumiRequestedFundInput = {
    amount: MasumiAmountInput;
    unit: string;
};
export type MasumiPaymentSourceSelection = {
    paymentSourceType?: undefined;
    supportedPaymentSourceIndex?: number;
} | {
    paymentSourceType: "Web3CardanoV1";
    supportedPaymentSourceIndex?: never;
} | {
    paymentSourceType: "Web3CardanoV2";
    supportedPaymentSourceIndex: number;
};
export type MasumiAmount = {
    amount: string;
    unit: string;
};
export type MasumiCreatePaymentInput = {
    taskId: string;
    costCents?: MasumiAmountInput;
    credits?: MasumiAmountInput;
    totalCostUsd?: number | string;
    totalCost?: number | string;
    amountRawUnits?: MasumiAmountInput;
    rawAmount?: MasumiAmountInput;
    payByTime?: MasumiDateInput;
    submitResultTime?: MasumiDateInput;
    RequestedFunds?: MasumiRequestedFundInput[];
    requestedFunds?: MasumiRequestedFundInput[];
    agentIdentifier?: string;
    network?: MasumiNetworkInput;
    inputHash?: string;
    metadata?: string | Record<string, unknown>;
    identifierFromPurchaser?: string;
} & MasumiPaymentSourceSelection;
export type MasumiCreatePaymentRequestBody = {
    agentIdentifier: string;
    network: MasumiNetwork;
    inputHash: string;
    payByTime: string;
    submitResultTime: string;
    metadata: string;
    identifierFromPurchaser: string;
    RequestedFunds: MasumiAmount[];
} & MasumiPaymentSourceSelection;
export declare const MASUMI_PAYMENT_ACTIONS: readonly ["None", "Ignore", "WaitingForManualAction", "WaitingForExternalAction", "SubmitResultRequested", "SubmitResultInitiated", "WithdrawRequested", "WithdrawInitiated", "AuthorizeRefundRequested", "AuthorizeRefundInitiated"];
export type MasumiPaymentAction = typeof MASUMI_PAYMENT_ACTIONS[number];
export declare const MASUMI_ON_CHAIN_STATES: readonly ["FundsLocked", "FundsOrDatumInvalid", "ResultSubmitted", "RefundRequested", "Disputed", "WithdrawAuthorized", "RefundAuthorized", "Withdrawn", "RefundWithdrawn", "DisputedWithdrawn"];
export type MasumiOnChainState = typeof MASUMI_ON_CHAIN_STATES[number];
/** @deprecated Use MASUMI_ON_CHAIN_STATES. */
export declare const MASUMI_ESCROW_STATES: readonly ["FundsLocked", "FundsOrDatumInvalid", "ResultSubmitted", "RefundRequested", "Disputed", "WithdrawAuthorized", "RefundAuthorized", "Withdrawn", "RefundWithdrawn", "DisputedWithdrawn"];
/** @deprecated Use MasumiOnChainState. */
export type MasumiEscrowState = MasumiOnChainState;
export declare const MASUMI_PAYMENT_ERROR_TYPES: readonly ["NetworkError", "Unknown"];
export type MasumiPaymentErrorType = typeof MASUMI_PAYMENT_ERROR_TYPES[number];
export declare const MASUMI_PAYMENT_SOURCE_TYPES: readonly ["Web3CardanoV1", "Web3CardanoV2"];
export type MasumiPaymentSourceType = typeof MASUMI_PAYMENT_SOURCE_TYPES[number];
export declare const MASUMI_PRICING_TYPES: readonly ["Fixed", "Free", "Dynamic"];
export type MasumiPricingType = typeof MASUMI_PRICING_TYPES[number];
export declare const MASUMI_TRANSACTION_STATUSES: readonly ["Pending", "Confirmed", "FailedViaTimeout", "FailedViaManualReset", "RolledBack"];
export type MasumiTransactionStatus = typeof MASUMI_TRANSACTION_STATUSES[number];
/** @deprecated Use MasumiPaymentAction. */
export type MasumiPaymentRequestedAction = MasumiPaymentAction;
export type MasumiPaymentNextAction = {
    requestedAction: MasumiPaymentAction;
    errorType: MasumiPaymentErrorType | null;
    errorNote: string | null;
    resultHash: string | null;
} & Record<string, unknown>;
export type MasumiPaymentSource = {
    id: string;
    network: MasumiNetwork;
    paymentSourceType: MasumiPaymentSourceType;
    smartContractAddress: string;
    policyId: string | null;
} & Record<string, unknown>;
export type MasumiBuyerWallet = {
    id: string;
    walletVkey: string;
} & Record<string, unknown>;
export type MasumiWallet = {
    id: string;
    walletVkey: string;
    walletAddress: string;
} & Record<string, unknown>;
export type MasumiPaymentActionHistoryEntry = MasumiPaymentNextAction & {
    id: string;
    createdAt: string;
    updatedAt: string;
    submittedTxHash: string | null;
};
export type MasumiPaymentTransaction = {
    id: string;
    createdAt: string;
    updatedAt: string;
    fees: string | null;
    blockHeight: number | null;
    blockTime: number | null;
    txHash: string | null;
    status: MasumiTransactionStatus;
    previousOnChainState: MasumiOnChainState | null;
    newOnChainState: MasumiOnChainState | null;
    confirmations: number | null;
} & Record<string, unknown>;
export type MasumiPaymentDetails = {
    id: string;
    createdAt: string;
    updatedAt: string;
    blockchainIdentifier: string;
    agentIdentifier: string | null;
    agentName: string | null;
    pricingType: MasumiPricingType;
    lastCheckedAt: string | null;
    payByTime: string | null;
    submitResultTime: string;
    unlockTime: string;
    collateralReturnLovelace: string | null;
    buyerReturnAddress: string | null;
    sellerReturnAddress: string | null;
    externalDisputeUnlockTime: string;
    requestedById: string;
    resultHash: string | null;
    nextActionLastChangedAt: string;
    onChainStateOrResultLastChangedAt: string;
    nextActionOrOnChainStateOrResultLastChangedAt: string;
    inputHash: string | null;
    totalBuyerCardanoFees: number;
    totalSellerCardanoFees: number;
    cooldownTime: number;
    cooldownTimeOtherParty: number;
    onChainState: MasumiOnChainState | null;
    NextAction: MasumiPaymentNextAction;
    CurrentTransaction: MasumiPaymentTransaction | null;
    RequestedFunds: MasumiAmount[];
    WithdrawnForSeller: MasumiAmount[];
    WithdrawnForBuyer: MasumiAmount[];
    PaymentSource: MasumiPaymentSource;
    BuyerWallet: MasumiBuyerWallet | null;
    SmartContractWallet: MasumiWallet | null;
    metadata: string | null;
} & Record<string, unknown>;
export type MasumiPayment = MasumiPaymentDetails & {
    ActionHistory: MasumiPaymentActionHistoryEntry[] | null;
    TransactionHistory: MasumiPaymentTransaction[] | null;
};
export type MasumiCreatePaymentResult = MasumiPaymentDetails & {
    requestBody: MasumiCreatePaymentRequestBody;
    costCents: string;
    amountRawUnits: string;
};
export type MasumiListPaymentsInput = {
    network?: MasumiNetworkInput;
    limit?: number;
    cursorId?: string | number;
    filterSmartContractAddress?: string;
    includeHistory?: boolean;
};
export type MasumiListPaymentsPage = Record<string, unknown> & {
    Payments: MasumiPayment[];
};
export type MasumiListPaymentsResult = MasumiListPaymentsPage | MasumiPayment[];
type MasumiSubmitResultHash = {
    submitResultHash: string;
    resultHash?: string;
} | {
    submitResultHash?: string;
    resultHash: string;
};
export type MasumiSubmitResultInput = MasumiSubmitResultHash & {
    network?: MasumiNetworkInput;
    blockchainIdentifier: string;
};
export type MasumiSubmitResultResponse = MasumiPaymentDetails;
export type MasumiFetch = JsonFetch;
export type MasumiPaymentClientOptions = {
    apiUrl?: string;
    apiToken?: string;
    agentIdentifier: string;
    network?: MasumiNetworkInput;
    paymentUnit?: string;
    fetchImpl?: MasumiFetch;
    timeoutMs?: number;
    now?: () => Date;
} & MasumiPaymentSourceSelection;
export type MasumiPaymentClient = {
    readonly apiUrl: string;
    readonly agentIdentifier: string;
    readonly network: MasumiNetwork;
    readonly paymentUnit: string;
    createPayment(input: MasumiCreatePaymentInput): Promise<MasumiCreatePaymentResult>;
    listPayments(input?: MasumiListPaymentsInput): Promise<MasumiListPaymentsResult>;
    submitResult(input: MasumiSubmitResultInput): Promise<MasumiSubmitResultResponse>;
};
export type MasumiPaymentClientPort = Pick<MasumiPaymentClient, "createPayment" | "listPayments" | "submitResult">;
export type MasumiPaymentErrorCode = "http_error" | "timeout" | "invalid_response";
export declare class MasumiPaymentError extends Error {
    readonly code: MasumiPaymentErrorCode;
    readonly statusCode?: number;
    readonly payload?: unknown;
    constructor(message: string, options: {
        code: MasumiPaymentErrorCode;
        statusCode?: number;
        payload?: unknown;
        cause?: unknown;
    });
}
export {};
