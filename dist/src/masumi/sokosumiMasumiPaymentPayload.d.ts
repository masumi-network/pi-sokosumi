import { type MasumiAmount, type MasumiCreatePaymentRequestBody, type MasumiNetwork, type MasumiPaymentSource, type MasumiWallet } from "./masumiPaymentTypes.js";
export type SokosumiMasumiPaymentPayload = {
    id?: string;
    blockchainIdentifier: string;
    agentIdentifier: string;
    sellerVkey: string;
    payByTime: string;
    submitResultTime: string;
    unlockTime: string;
    externalDisputeUnlockTime: string;
    inputHash: string;
    identifierFromPurchaser: string;
    Amounts: [MasumiAmount, ...MasumiAmount[]];
    PaymentSource?: {
        network: MasumiNetwork;
        smartContractAddress: string;
        policyId: string;
    };
};
export type SokosumiMasumiPaymentPayloadInput = Record<string, unknown> & {
    id?: string;
    blockchainIdentifier?: string;
    agentIdentifier?: string | null;
    sellerVkey?: string;
    payByTime?: string | null;
    submitResultTime?: string;
    unlockTime?: string;
    externalDisputeUnlockTime?: string;
    inputHash?: string | null;
    requestBody?: Partial<MasumiCreatePaymentRequestBody>;
    identifierFromPurchaser?: string;
    RequestedFunds?: MasumiAmount[];
    Amounts?: MasumiAmount[];
    PaymentSource?: Partial<MasumiPaymentSource> | null;
    SmartContractWallet?: Partial<MasumiWallet> | null;
    SellerWallet?: Partial<MasumiWallet> | null;
};
export declare function createSokosumiMasumiPaymentPayload(payment?: SokosumiMasumiPaymentPayloadInput | SokosumiMasumiPaymentPayload): SokosumiMasumiPaymentPayload;
