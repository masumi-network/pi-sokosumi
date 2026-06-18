export declare const MASUMI_NETWORKS: string[];
export declare const MASUMI_USDM_UNITS: Readonly<{
    Preprod: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d";
    Mainnet: "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d";
}>;
export declare const MASUMI_CENT_RAW_UNITS = 10000n;
export declare const MASUMI_DEFAULT_PAY_BY_MS: number;
export declare const MASUMI_DEFAULT_SUBMIT_RESULT_MS: number;
export declare function createMasumiPaymentClient({ apiUrl, apiToken, agentIdentifier, network, paymentUnit, fetchImpl, timeoutMs, now }?: {
    network?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    now?: () => Date;
}): {
    apiUrl: any;
    agentIdentifier: string;
    network: string;
    paymentUnit: string;
    createPayment(input?: {}): Promise<any>;
    listPayments(input?: {}): Promise<any>;
    submitResult(input?: {}): Promise<any>;
};
export declare function createSokosumiMasumiPaymentPayload(payment?: {}): {
    id: any;
    blockchainIdentifier: any;
    agentIdentifier: any;
    sellerVkey: any;
    payByTime: any;
    submitResultTime: any;
    unlockTime: any;
    externalDisputeUnlockTime: any;
    inputHash: any;
    identifierFromPurchaser: any;
    Amounts: {
        amount: string;
        unit: string;
    }[];
    PaymentSource: {
        network: any;
        smartContractAddress: any;
        policyId: any;
    };
};
export declare function canonicalJson(value: any): string;
export declare function sha256Hex(value: any): string;
export declare function usdToMasumiCostCents(value: any): bigint;
export declare function creditsToMasumiCostCents(value: any): bigint;
export declare function creditsToMasumiRawUnits(value: any): bigint;
export declare function normalizeMasumiRawUnits(value: any): bigint;
export declare function normalizeMasumiCostCents(value: any): bigint;
export declare function masumiCentsToRawUnits(costCents: any): bigint;
export declare function normalizeMasumiNetwork(value: any): "Mainnet" | "Preprod";
export declare function normalizeMasumiApiUrl(value: any): any;
