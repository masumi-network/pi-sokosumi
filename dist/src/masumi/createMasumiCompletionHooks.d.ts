import { type SokosumiTaskEvent, type SokosumiTaskEventInput, type SokosumiTaskSnapshot } from "../client/types.js";
import type { SokosumiAfterTaskEventCreatedInput, SokosumiBeforeTaskEventCreatedInput } from "../poller/createSokosumiTaskPoller.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
import { type MasumiAmountInput, type MasumiCreatePaymentInput } from "./masumiPaymentClient.js";
import { type SokosumiMasumiPaymentPayloadInput, type SokosumiMasumiPaymentPayload } from "./sokosumiMasumiPaymentPayload.js";
import type { MasumiPaymentStore, MasumiPendingPaymentRecord } from "./masumiPaymentStore.js";
export type MasumiCompletionCostDetails = {
    costCents?: MasumiAmountInput;
    credits?: MasumiAmountInput;
    totalCredits?: MasumiAmountInput;
    amountRawUnits?: MasumiAmountInput;
    rawAmount?: MasumiAmountInput;
};
export type MasumiCompletionCostResult = MasumiAmountInput | MasumiCompletionCostDetails | false | null | undefined | "";
export type MasumiCompletionTaskEvent<TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = TTaskEvent extends unknown ? Omit<TTaskEvent, "credits" | "masumiPayment"> & {
    masumiPayment: SokosumiMasumiPaymentPayload;
} : never;
export type MasumiCompletionBeforeHookResult<TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = TTaskEvent | MasumiCompletionTaskEvent<TTaskEvent>;
export type MasumiCompletionPaymentClient<TResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput> = {
    createPayment(input: MasumiCreatePaymentInput): Awaitable<TResult>;
};
export type MasumiCompletionHooksOptions<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord, TPaymentResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput> = {
    enabled?: boolean;
    masumiClient?: MasumiCompletionPaymentClient<TPaymentResult>;
    store?: Pick<MasumiPaymentStore<TRecord>, "recordPendingMasumiPayment">;
    calculateCostCents?: (input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>) => Awaitable<MasumiCompletionCostResult>;
    createPaymentMetadata?: (input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent> & {
        costCents: bigint;
        amountRawUnits: bigint | null;
    }) => Awaitable<string | Record<string, unknown>>;
    logger?: SokosumiLogger;
};
export type MasumiCompletionHooks<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    beforeTaskEventCreated(input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>): Promise<MasumiCompletionBeforeHookResult<TTaskEvent>>;
    afterTaskEventCreated(input: SokosumiAfterTaskEventCreatedInput<TEvent, TTask, MasumiCompletionBeforeHookResult<TTaskEvent>, TCreatedTaskEvent>): Promise<TRecord | undefined>;
};
export declare function createMasumiCompletionHooks<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord, TPaymentResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput>({ enabled, masumiClient, store, calculateCostCents, createPaymentMetadata, logger }?: MasumiCompletionHooksOptions<TEvent, TTask, TTaskEvent, TCreatedTaskEvent, TRecord, TPaymentResult>): MasumiCompletionHooks<TEvent, TTask, TTaskEvent, TCreatedTaskEvent, TRecord>;
