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
};
export type MasumiCreatePaymentRequestBody = {
    agentIdentifier: string;
    network: MasumiNetwork;
    inputHash: string;
    payByTime: string;
    submitResultTime: string;
    metadata: string;
    identifierFromPurchaser: string;
    RequestedFunds: MasumiAmount[];
};
export declare const MASUMI_ESCROW_STATES: readonly ["FundsLockingRequested", "FundsLocked", "ResultSubmitted", "Completed", "RefundRequested", "RefundAuthorized", "Disputed"];
export type MasumiEscrowState = typeof MASUMI_ESCROW_STATES[number];
export type MasumiPaymentRequestedAction = MasumiEscrowState | "SubmitResultRequested";
export type MasumiPaymentNextAction = {
    requestedAction?: MasumiPaymentRequestedAction | null;
    errorType?: string | null;
    errorNote?: string | null;
} & Record<string, unknown>;
export type MasumiPaymentSource = {
    network?: MasumiNetwork;
    smartContractAddress?: string;
    policyId?: string | null;
} & Record<string, unknown>;
export type MasumiWallet = {
    walletVkey?: string | null;
} & Record<string, unknown>;
export type MasumiPayment = {
    id?: string;
    blockchainIdentifier?: string;
    agentIdentifier?: string;
    payByTime?: string;
    submitResultTime?: string;
    unlockTime?: string;
    externalDisputeUnlockTime?: string;
    inputHash?: string;
    identifierFromPurchaser?: string;
    RequestedFunds?: MasumiAmount[];
    Amounts?: MasumiAmount[];
    PaymentSource?: MasumiPaymentSource;
    SmartContractWallet?: MasumiWallet;
    SellerWallet?: MasumiWallet;
    NextAction?: MasumiPaymentNextAction;
    onChainState?: MasumiEscrowState | null;
} & Record<string, unknown>;
export type MasumiCreatePaymentResult = MasumiPayment & {
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
    Payments?: MasumiPayment[];
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
export type MasumiSubmitResultResponse = Record<string, unknown>;
export type MasumiFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;
export type MasumiPaymentClientOptions = {
    apiUrl?: string;
    apiToken?: string;
    agentIdentifier: string;
    network?: MasumiNetworkInput;
    paymentUnit?: string;
    fetchImpl?: MasumiFetch;
    timeoutMs?: number;
    now?: () => Date;
};
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
export declare function createMasumiPaymentClient(options: MasumiPaymentClientOptions): MasumiPaymentClient;
export type SokosumiMasumiPaymentPayload = {
    id: string;
    blockchainIdentifier: string;
    agentIdentifier: string;
    sellerVkey: string | null;
    payByTime: string;
    submitResultTime: string;
    unlockTime: string;
    externalDisputeUnlockTime: string;
    inputHash: string;
    identifierFromPurchaser: string;
    Amounts: MasumiAmount[];
    PaymentSource: {
        network: MasumiNetwork | "";
        smartContractAddress: string;
        policyId: string | null;
    };
};
export declare function createSokosumiMasumiPaymentPayload(payment?: (MasumiPayment & {
    requestBody?: Partial<MasumiCreatePaymentRequestBody>;
})): SokosumiMasumiPaymentPayload;
export declare function canonicalJson(value: unknown): string;
export declare function sha256Hex(value: unknown): string;
export declare function usdToMasumiCostCents(value: number | string): bigint;
export declare function creditsToMasumiCostCents(value: MasumiAmountInput): bigint;
export declare function creditsToMasumiRawUnits(value: MasumiAmountInput): bigint;
export declare function normalizeMasumiRawUnits(value: MasumiAmountInput): bigint;
export declare function normalizeMasumiCostCents(value: MasumiAmountInput): bigint;
export declare function masumiCentsToRawUnits(costCents: MasumiAmountInput): bigint;
export declare function normalizeMasumiNetwork(value: unknown): MasumiNetwork;
export declare function normalizeMasumiApiUrl(value: unknown): string;
export {};
