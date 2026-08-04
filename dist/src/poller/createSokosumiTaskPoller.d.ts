import { type ListSokosumiCoworkerEventsInput, type SokosumiCoworkerEventPage, type SokosumiTaskEvent, type SokosumiTaskEventInput, type SokosumiTaskSnapshot, type SokosumiTaskStatus } from "../client/types.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
export type SokosumiTaskPollerClient<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent> = {
    listCoworkerEvents(input?: ListSokosumiCoworkerEventsInput): Promise<SokosumiCoworkerEventPage<TEvent>>;
    getTask(taskId: string): Promise<TTask | undefined>;
    createTaskEvent(taskId: string, body: SokosumiTaskEventInput): Promise<TCreatedTaskEvent>;
    updateTask?(input: {
        taskId: string;
        status: SokosumiTaskStatus;
    }): Promise<TTask | SokosumiTaskSnapshot | undefined>;
};
export type SokosumiTaskPollerEventInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>> = {
    event: TEvent;
    task: TTask;
};
export type SokosumiFailedTaskEventInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>> = SokosumiTaskPollerEventInput<TEvent, TTask> & {
    error: unknown;
};
export type SokosumiStaleInputRequiredEventInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>> = SokosumiTaskPollerEventInput<TEvent, TTask> & {
    inputRequiredEvent: TEvent;
    now: Date;
};
export type SokosumiBeforeTaskEventCreatedInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = SokosumiTaskPollerEventInput<TEvent, TTask> & {
    taskId: string;
    taskEvent: TTaskEvent;
};
export type SokosumiAfterTaskEventCreatedInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent> = SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent> & {
    createdTaskEvent: TCreatedTaskEvent;
};
export type SokosumiTaskEventFactory<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = (input: SokosumiTaskPollerEventInput<TEvent, TTask>) => Awaitable<TTaskEvent | undefined>;
export type SokosumiTaskPollerOptions<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent> = {
    client: SokosumiTaskPollerClient<TEvent, TTask, TCreatedTaskEvent>;
    intervalMs?: number;
    limit?: number;
    maxPages?: number;
    logger?: SokosumiLogger;
    shouldProcessEvent?: (event: TEvent, task: TTask) => boolean;
    hasTaskProgress?: (task: TTask, triggerEvent: TEvent) => boolean;
    createReopenedEvent?: SokosumiTaskEventFactory<TEvent, TTask> | null;
    createRunningEvent?: SokosumiTaskEventFactory<TEvent, TTask> | null;
    createCanceledEvent?: SokosumiTaskEventFactory<TEvent, TTask> | null;
    createCompletedEvent?: SokosumiTaskEventFactory<TEvent, TTask, TTaskEvent>;
    createFailedEvent?: (input: SokosumiFailedTaskEventInput<TEvent, TTask>) => Awaitable<SokosumiTaskEventInput | undefined>;
    createStaleInputRequiredEvent?: (input: SokosumiStaleInputRequiredEventInput<TEvent, TTask>) => Awaitable<TTaskEvent | undefined>;
    inputRequiredTimeoutMs?: number;
    now?: () => Date;
    beforeTaskEventCreated?: (input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>) => Awaitable<TTaskEvent | undefined>;
    afterTaskEventCreated?: (input: SokosumiAfterTaskEventCreatedInput<TEvent, TTask, TTaskEvent, TCreatedTaskEvent>) => Awaitable<unknown>;
};
export type SokosumiTaskPoller = {
    start(): void;
    stop(): void;
    tick(): Promise<void>;
};
export declare function createSokosumiTaskPoller<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent>({ client, intervalMs, limit, maxPages, logger, shouldProcessEvent, hasTaskProgress, createReopenedEvent, createRunningEvent, createCanceledEvent, createCompletedEvent, createFailedEvent, createStaleInputRequiredEvent, inputRequiredTimeoutMs, now, beforeTaskEventCreated, afterTaskEventCreated }: SokosumiTaskPollerOptions<TEvent, TTask, TTaskEvent, TCreatedTaskEvent>): SokosumiTaskPoller;
