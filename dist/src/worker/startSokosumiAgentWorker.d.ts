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
export type SokosumiWorkerCreatedTaskEvent<TClient extends SokosumiTaskPollerClient = SokosumiTaskPollerClient> = Awaited<ReturnType<TClient["createTaskEvent"]>>;
export type SokosumiAgentWorkerClientOption<TClient extends SokosumiTaskPollerClient = SokosumiHttpClient> = SokosumiHttpClient extends TClient ? {
    client?: TClient;
} : {
    client: TClient;
};
export type SokosumiAgentWorkerTaskHandlerOption<TTaskContext extends SokosumiTaskContext, TTaskEvent extends SokosumiTaskEventInput, TClient extends SokosumiTaskPollerClient, TTrace extends SokosumiTaskTrace> = SokosumiTaskEventInput extends TTaskEvent ? {
    createTaskHandler?: SokosumiTaskCompletionHandlerOptions<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent, TClient, TTaskContext, TTrace>["createTaskHandler"];
} : {
    createTaskHandler: SokosumiTaskCompletionHandlerOptions<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent, TClient, TTaskContext, TTrace>["createTaskHandler"];
};
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
    createStaleInputRequiredEvent?: (input: SokosumiStaleInputRequiredEventInput<SokosumiTaskEvent, SokosumiTaskSnapshot> & {
        client: TClient;
    }) => Awaitable<TTaskEvent | undefined>;
    beforeTaskEventCreated?: (input: SokosumiBeforeTaskEventCreatedInput<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent> & {
        client: TClient;
    }) => Awaitable<TTaskEvent | undefined>;
    afterTaskEventCreated?: (input: SokosumiAfterTaskEventCreatedInput<SokosumiTaskEvent, SokosumiTaskSnapshot, TTaskEvent, SokosumiWorkerCreatedTaskEvent<TClient>> & {
        client: TClient;
    }) => Awaitable<unknown>;
} & SokosumiTaskContextResolverOption<SokosumiTaskEvent, SokosumiTaskSnapshot, TClient, TTaskContext, TTrace> & SokosumiAgentWorkerClientOption<TClient> & SokosumiAgentWorkerTaskHandlerOption<TTaskContext, TTaskEvent, TClient, TTrace>;
export type SokosumiAgentWorkerRuntime<TClient = SokosumiHttpClient> = {
    client: TClient;
    poller: SokosumiTaskPoller;
};
export declare function startSokosumiAgentWorker(): SokosumiAgentWorkerRuntime<SokosumiHttpClient> | undefined;
export declare function startSokosumiAgentWorker<TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient extends SokosumiTaskPollerClient = SokosumiHttpClient, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace>(options: SokosumiAgentWorkerOptions<TTaskContext, TTaskEvent, TClient, TTrace>): SokosumiAgentWorkerRuntime<TClient> | undefined;
export declare function createRunningTaskEvent(comment: string | null | undefined): SokosumiTaskEventInput;
export declare function createSokosumiTaskCompletionHandler<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>, TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput, TClient = SokosumiHttpClient, TTaskContext extends SokosumiTaskContext = SokosumiTaskContext, TTrace extends SokosumiTaskTrace = SokosumiTaskTrace>({ client, logger, createTrace, resolveTaskContext, createTaskHandler }: SokosumiTaskCompletionHandlerOptions<TEvent, TTask, TTaskEvent, TClient, TTaskContext, TTrace>): SokosumiTaskCompletionHandler<TEvent, TTask, TTaskEvent>;
export declare function getSokosumiEventText(event: SokosumiTaskEvent): string;
export declare function getSokosumiTaskPrimaryText(task: SokosumiTaskSnapshot): string;
export {};
