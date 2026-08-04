import type { MasumiNetwork } from "./masumiPaymentClient.js";
import type { SokosumiMasumiPaymentPayload } from "./sokosumiMasumiPaymentPayload.js";
export declare const MASUMI_PAYMENT_SUBMIT_STATUSES: readonly ["pending", "submitted", "dropped"];
export type MasumiPaymentSubmitStatus = typeof MASUMI_PAYMENT_SUBMIT_STATUSES[number];
type PendingMasumiPaymentIdentity = {
    blockchainIdentifier: string;
    masumiPayment?: Partial<SokosumiMasumiPaymentPayload> | Record<string, unknown>;
} | {
    blockchainIdentifier?: never;
    masumiPayment: (Partial<SokosumiMasumiPaymentPayload> & {
        blockchainIdentifier: string;
    }) | (Record<string, unknown> & {
        blockchainIdentifier: string;
    });
};
export type RecordPendingMasumiPaymentInput = PendingMasumiPaymentIdentity & {
    id?: string;
    taskId: string;
    triggerEventId?: string;
    taskEventId?: string;
    paymentId?: string;
    agentIdentifier?: string;
    network?: MasumiNetwork | "";
    resultHash: string;
    submitStatus?: MasumiPaymentSubmitStatus;
    completionPayload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    submitResponse?: Record<string, unknown>;
    errorType?: string;
    errorNote?: string;
    createdAt?: string;
    updatedAt?: string;
    submittedAt?: string;
    droppedAt?: string;
};
export type MasumiPendingPaymentRecord = {
    id: string;
    taskId: string;
    triggerEventId: string;
    taskEventId: string;
    paymentId: string;
    blockchainIdentifier: string;
    agentIdentifier: string;
    network: MasumiNetwork | "";
    resultHash: string;
    submitStatus: MasumiPaymentSubmitStatus;
    masumiPayment: Record<string, unknown>;
    completionPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    submitResponse: Record<string, unknown>;
    errorType: string;
    errorNote: string;
    createdAt: string;
    updatedAt: string;
    submittedAt: string;
    droppedAt: string;
};
export type ListPendingMasumiPaymentsInput = {
    limit?: number;
};
export type MarkMasumiSubmittedInput = {
    blockchainIdentifier: string;
    response?: unknown;
};
export type MarkMasumiDroppedInput = {
    blockchainIdentifier: string;
    errorType?: string;
    errorNote?: string;
};
export type MasumiPaymentStoreStatus = {
    provider: string;
    configured: boolean;
    persistent: boolean;
    pending: number;
    startedAt: string;
};
export type MasumiPaymentStore<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    provider?: string;
    status?(): MasumiPaymentStoreStatus;
    recordPendingMasumiPayment(input: RecordPendingMasumiPaymentInput): Promise<TRecord>;
    listPendingMasumiPayments(input?: ListPendingMasumiPaymentsInput): Promise<TRecord[]>;
    markMasumiSubmitted(input: MarkMasumiSubmittedInput): Promise<TRecord>;
    markMasumiDropped(input: MarkMasumiDroppedInput): Promise<TRecord>;
};
export type MemoryMasumiPaymentStore = MasumiPaymentStore & {
    provider: "memory";
    status(): MasumiPaymentStoreStatus & {
        provider: "memory";
        configured: true;
        persistent: false;
    };
};
export declare function createMemoryMasumiPaymentStore(): MemoryMasumiPaymentStore;
export declare function normalizePendingPayment(input: RecordPendingMasumiPaymentInput): MasumiPendingPaymentRecord;
export {};
