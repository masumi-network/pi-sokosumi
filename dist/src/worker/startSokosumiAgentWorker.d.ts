import { type SokosumiHttpClient } from "../client/httpSokosumiClient.js";
import { type SokosumiAfterTaskEventCreatedInput, type SokosumiBeforeTaskEventCreatedInput, type SokosumiStaleInputRequiredEventInput, type SokosumiTaskPoller, type SokosumiTaskPollerClient, type SokosumiTaskPollerEventInput } from "../poller/createSokosumiTaskPoller.js";
import { type SokosumiIdentity } from "../identity/resolveSokosumiIdentity.js";
import { type SokosumiTaskEvent, type SokosumiTaskEventInput, type SokosumiTaskSnapshot } from "../client/types.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
export type SokosumiTraceStep = {
    name: string;
    metadata?: Record<string, unknown>;
    options?: Record<string, unknown>;
};
export type SokosumiTaskTrace = {
    step(name: string, metadata?: Record<string, unknown>, options?: Record<string, unknown>): Awaitable<void>;
    updateContext?(context: Record<string, unknown>): void;
};
export type SokosumiTaskContext = Record<string, unknown> & {
    traceContext?: Record<string, unknown>;
    traceStep?: SokosumiTraceStep;
    taskPatch?: Record<string, unknown>;
};
export type SokosumiTaskCompletionInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>> = SokosumiTaskPollerEventInput<TEvent, TTask>;
export type SokosumiTaskHandlerInput<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TClient = SokosumiHttpClient, TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace> = SokosumiTaskCompletionInput<TEvent, TTask> & {
    client: TClient;
    trace: TTrace | undefined;
    identity: SokosumiIdentity | null;
    taskContext: TTaskContext;
};
export type SokosumiResolveTaskContext<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TClient = SokosumiHttpClient, TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace> = (input: SokosumiTaskCompletionInput<TEvent, TTask> & {
    client: TClient;
    trace: TTrace | undefined;
    identity: SokosumiIdentity | null;
}) => Awaitable<TTaskContext>;
type SokosumiTaskContextResolverOption<TEvent extends SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent>, TClient, TTaskContext extends SokosumiTaskContext, TTrace extends SokosumiTaskTrace> = SokosumiTaskContext extends TTaskContext ? {
    resolveTaskContext?: SokosumiResolveTaskContext<TEvent, TTask, TClient, TTaskContext, TTrace>;
} : {
    resolveTaskContext: SokosumiResolveTaskContext<TEvent, TTask, TClient, TTaskContext, TTrace>;
};
export type SokosumiTaskCompletionHandlerOptions<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient = SokosumiHttpClient, TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace> = {
    client: TClient;
    logger?: SokosumiLogger;
    createTrace?: (input: SokosumiTaskCompletionInput<TEvent, TTask> & {
        client: TClient;
        identity: SokosumiIdentity | null;
    }) => Awaitable<TTrace | undefined>;
    createTaskHandler: (input: SokosumiTaskHandlerInput<TEvent, TTask, TClient, TTaskContext, TTrace>) => Awaitable<TTaskEvent | undefined>;
} & SokosumiTaskContextResolverOption<TEvent, TTask, TClient, TTaskContext, TTrace>;
export type SokosumiTaskCompletionHandler<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> = (input: SokosumiTaskCompletionInput<TEvent, TTask>) => Promise<TTaskEvent | undefined>;
export type SokosumiAgentWorkerOptions<TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient extends SokosumiTaskPollerClient = SokosumiHttpClient, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace> = {
    enabled?: boolean;
    apiUrl?: string;
    apiKey?: string;
    intervalMs?: number;
    limit?: number;
    maxPages?: number;
    logger?: SokosumiLogger;
    runningComment?: string;
    canceledComment?: string;
    bootstrapComment?: string;
    inputRequiredTimeoutMs?: number;
    createTrace?: SokosumiTaskCompletionHandlerOptions<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent, TClient, TTaskContext, TTrace>["createTrace"];
    createTaskHandler?: SokosumiTaskCompletionHandlerOptions<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent, TClient, TTaskContext, TTrace>["createTaskHandler"];
    createStaleInputRequiredEvent?: (input: SokosumiStaleInputRequiredEventInput & {
        client: TClient;
    }) => Awaitable<SokosumiTaskEventInput | undefined>;
    beforeTaskEventCreated?: (input: SokosumiBeforeTaskEventCreatedInput & {
        client: TClient;
    }) => Awaitable<SokosumiTaskEventInput | undefined>;
    afterTaskEventCreated?: (input: SokosumiAfterTaskEventCreatedInput & {
        client: TClient;
    }) => Awaitable<unknown>;
    client?: TClient;
} & SokosumiTaskContextResolverOption<SokosumiTaskEvent, SokosumiTaskSnapshot, TClient, TTaskContext, TTrace>;
export type SokosumiAgentWorkerRuntime<TClient = SokosumiHttpClient> = {
    client: TClient;
    poller: SokosumiTaskPoller;
};
export declare function startSokosumiAgentWorker<TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient extends SokosumiTaskPollerClient = SokosumiHttpClient, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace>({ enabled, apiUrl, apiKey, intervalMs, limit, maxPages, logger, runningComment, canceledComment, bootstrapComment, inputRequiredTimeoutMs, createTaskHandler, createTrace, resolveTaskContext, createStaleInputRequiredEvent, beforeTaskEventCreated, afterTaskEventCreated, client: providedClient }?: SokosumiAgentWorkerOptions<TTaskContext, TTaskEvent, TClient, TTrace>): SokosumiAgentWorkerRuntime<TClient> | undefined;
export declare function createRunningTaskEvent(comment: string | null | undefined): SokosumiTaskEventInput;
export declare function createSokosumiTaskCompletionHandler<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient = SokosumiHttpClient, TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace>({ client, logger, createTrace, resolveTaskContext, createTaskHandler }: SokosumiTaskCompletionHandlerOptions<TEvent, TTask, TTaskEvent, TClient, TTaskContext, TTrace>): SokosumiTaskCompletionHandler<TEvent, TTask, TTaskEvent>;
export declare function getSokosumiEventText(event: SokosumiTaskEvent): string;
export declare function getSokosumiTaskPrimaryText(task: SokosumiTaskSnapshot): string;
export {};
