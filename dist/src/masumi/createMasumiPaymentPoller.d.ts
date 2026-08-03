import type { SokosumiLogger } from "../sharedTypes.js";
import type { MasumiListPaymentsInput, MasumiListPaymentsResult, MasumiPayment, MasumiSubmitResultInput, MasumiSubmitResultResponse } from "./masumiPaymentClient.js";
import type { ListPendingMasumiPaymentsInput, MarkMasumiDroppedInput, MarkMasumiSubmittedInput, MasumiPendingPaymentRecord } from "./masumiPaymentStore.js";
export type MasumiPaymentPollerClient = {
    listPayments(input?: MasumiListPaymentsInput): Promise<MasumiListPaymentsResult>;
    submitResult(input: MasumiSubmitResultInput): Promise<MasumiSubmitResultResponse>;
};
export type MasumiPaymentPollerStore<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    listPendingMasumiPayments(input?: ListPendingMasumiPaymentsInput): Promise<TRecord[]>;
    markMasumiSubmitted(input: MarkMasumiSubmittedInput): Promise<TRecord>;
    markMasumiDropped(input: MarkMasumiDroppedInput): Promise<TRecord>;
};
export type EnabledMasumiPaymentPollerOptions<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    enabled?: true;
    client: MasumiPaymentPollerClient;
    store: MasumiPaymentPollerStore<TRecord>;
    intervalMs?: number;
    limit?: number;
    logger?: SokosumiLogger;
};
export type DisabledMasumiPaymentPollerOptions<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    enabled: false;
    client?: MasumiPaymentPollerClient;
    store?: MasumiPaymentPollerStore<TRecord>;
    intervalMs?: number;
    limit?: number;
    logger?: SokosumiLogger;
};
export type MasumiPaymentPollerOptions<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = EnabledMasumiPaymentPollerOptions<TRecord> | DisabledMasumiPaymentPollerOptions<TRecord>;
export type MasumiPaymentPoller = {
    start(): void;
    stop(): void;
    tick(): Promise<void>;
};
export declare function createMasumiPaymentPoller<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord>(options: MasumiPaymentPollerOptions<TRecord>): MasumiPaymentPoller;
export declare function isReadyForSubmitResult(payment: MasumiPayment): boolean;
