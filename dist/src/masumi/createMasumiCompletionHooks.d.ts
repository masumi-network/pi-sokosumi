import { type SokosumiTaskEvent, type SokosumiTaskEventInput, type SokosumiTaskSnapshot } from "../client/types.js";
import type { SokosumiAfterTaskEventCreatedInput, SokosumiBeforeTaskEventCreatedInput } from "../poller/createSokosumiTaskPoller.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
import { type MasumiAmountInput, type MasumiPaymentClient, type SokosumiMasumiPaymentPayload } from "./masumiPaymentClient.js";
import type { MasumiPaymentStore, MasumiPendingPaymentRecord } from "./masumiPaymentStore.js";
export type MasumiCompletionCostDetails = {
    costCents?: MasumiAmountInput;
    credits?: MasumiAmountInput;
    totalCredits?: MasumiAmountInput;
    amountRawUnits?: MasumiAmountInput;
    rawAmount?: MasumiAmountInput;
};
export type MasumiCompletionCostResult = MasumiAmountInput | MasumiCompletionCostDetails | false | null | undefined | "";
export type MasumiCompletionTaskEvent<TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = TTaskEvent & {
    masumiPayment?: SokosumiMasumiPaymentPayload;
};
export type MasumiCompletionHooksOptions<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    enabled?: boolean;
    masumiClient?: Pick<MasumiPaymentClient, "createPayment">;
    store?: Pick<MasumiPaymentStore<TRecord>, "recordPendingMasumiPayment">;
    calculateCostCents?: (input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>) => Awaitable<MasumiCompletionCostResult>;
    createPaymentMetadata?: (input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent> & {
        costCents: bigint;
        amountRawUnits: bigint | null;
    }) => Awaitable<string | Record<string, unknown>>;
    logger?: SokosumiLogger;
};
export type MasumiCompletionHooks<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
    beforeTaskEventCreated(input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>): Promise<MasumiCompletionTaskEvent<TTaskEvent>>;
    afterTaskEventCreated(input: SokosumiAfterTaskEventCreatedInput<TEvent, TTask, MasumiCompletionTaskEvent<TTaskEvent>, TCreatedTaskEvent>): Promise<TRecord | undefined>;
};
export declare function createMasumiCompletionHooks<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord>({ enabled, masumiClient, store, calculateCostCents, createPaymentMetadata, logger }?: MasumiCompletionHooksOptions<TEvent, TTask, TTaskEvent, TCreatedTaskEvent, TRecord>): MasumiCompletionHooks<TEvent, TTask, TTaskEvent, TCreatedTaskEvent, TRecord>;
