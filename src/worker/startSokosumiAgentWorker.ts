import { createHttpSokosumiClient, type SokosumiHttpClient } from "../client/httpSokosumiClient.js";
import {
  createSokosumiTaskPoller,
  type SokosumiAfterTaskEventCreatedInput,
  type SokosumiBeforeTaskEventCreatedInput,
  type SokosumiStaleInputRequiredEventInput,
  type SokosumiTaskPoller,
  type SokosumiTaskPollerClient,
  type SokosumiTaskPollerEventInput
} from "../poller/createSokosumiTaskPoller.js";
import {
  resolveSokosumiIdentity,
  type SokosumiIdentity
} from "../identity/resolveSokosumiIdentity.js";
import {
  SOKOSUMI_TASK_EVENT_STATUS,
  type SokosumiTaskEvent,
  type SokosumiTaskEventInput,
  type SokosumiTaskSnapshot
} from "../client/types.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
import { normalizeText } from "../sharedTypes.js";
import { getErrorMessage } from "../sharedTypes.js";

export type SokosumiTraceStep = {
  name: string;
  metadata?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

export type SokosumiTaskTrace = {
  step(
    name: string,
    metadata?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Awaitable<void>;
  updateContext?(context: Record<string, unknown>): void;
};

export type SokosumiTaskContext = Record<string, unknown> & {
  traceContext?: Record<string, unknown>;
  traceStep?: SokosumiTraceStep;
  taskPatch?: Record<string, unknown>;
};

export type SokosumiTaskCompletionInput<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>
> = SokosumiTaskPollerEventInput<TEvent, TTask>;

export type SokosumiTaskHandlerInput<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TClient = SokosumiHttpClient,
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
> = SokosumiTaskCompletionInput<TEvent, TTask> & {
  client: TClient;
  trace: TTrace | undefined;
  identity: SokosumiIdentity | null;
  taskContext: TTaskContext;
};

export type SokosumiResolveTaskContext<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TClient = SokosumiHttpClient,
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
> = (
  input: SokosumiTaskCompletionInput<TEvent, TTask> & {
    client: TClient;
    trace: TTrace | undefined;
    identity: SokosumiIdentity | null;
  }
) => Awaitable<TTaskContext>;

type SokosumiTaskContextResolverOption<
  TEvent extends SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent>,
  TClient,
  TTaskContext extends SokosumiTaskContext,
  TTrace extends SokosumiTaskTrace
> = SokosumiTaskContext extends TTaskContext
  ? { resolveTaskContext?: SokosumiResolveTaskContext<TEvent, TTask, TClient, TTaskContext, TTrace> }
  : { resolveTaskContext: SokosumiResolveTaskContext<TEvent, TTask, TClient, TTaskContext, TTrace> };

export type SokosumiTaskCompletionHandlerOptions<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TClient = SokosumiHttpClient,
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
> = {
  client: TClient;
  logger?: SokosumiLogger;
  createTrace?: (
    input: SokosumiTaskCompletionInput<TEvent, TTask> & {
      client: TClient;
      identity: SokosumiIdentity | null;
    }
  ) => Awaitable<TTrace | undefined>;
  createTaskHandler: (
    input: SokosumiTaskHandlerInput<TEvent, TTask, TClient, TTaskContext, TTrace>
  ) => Awaitable<TTaskEvent | undefined>;
} & SokosumiTaskContextResolverOption<TEvent, TTask, TClient, TTaskContext, TTrace>;

export type SokosumiTaskCompletionHandler<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput
> = (input: SokosumiTaskCompletionInput<TEvent, TTask>) => Promise<TTaskEvent | undefined>;

export type SokosumiWorkerCreatedTaskEvent<
  TClient extends SokosumiTaskPollerClient = SokosumiTaskPollerClient
> = Awaited<ReturnType<TClient["createTaskEvent"]>>;

export type SokosumiAgentWorkerClientOption<
  TClient extends SokosumiTaskPollerClient = SokosumiHttpClient
> = SokosumiHttpClient extends TClient
  ? { client?: TClient }
  : { client: TClient };

export type SokosumiAgentWorkerTaskHandlerOption<
  TTaskContext extends SokosumiTaskContext,
  TTaskEvent extends SokosumiTaskEventInput,
  TClient extends SokosumiTaskPollerClient,
  TTrace extends SokosumiTaskTrace
> = SokosumiTaskEventInput extends TTaskEvent
  ? {
      createTaskHandler?: SokosumiTaskCompletionHandlerOptions<
        SokosumiTaskEvent,
        SokosumiTaskSnapshot,
        TTaskEvent,
        TClient,
        TTaskContext,
        TTrace
      >["createTaskHandler"];
    }
  : {
      createTaskHandler: SokosumiTaskCompletionHandlerOptions<
        SokosumiTaskEvent,
        SokosumiTaskSnapshot,
        TTaskEvent,
        TClient,
        TTaskContext,
        TTrace
      >["createTaskHandler"];
    };

export type SokosumiAgentWorkerOptions<
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TClient extends SokosumiTaskPollerClient = SokosumiHttpClient,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
> = {
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
  createTrace?: SokosumiTaskCompletionHandlerOptions<
    SokosumiTaskEvent,
    SokosumiTaskSnapshot,
    TTaskEvent,
    TClient,
    TTaskContext,
    TTrace
  >["createTrace"];
  createStaleInputRequiredEvent?: (
    input: SokosumiStaleInputRequiredEventInput<SokosumiTaskEvent, SokosumiTaskSnapshot> & {
      client: TClient;
    }
  ) => Awaitable<TTaskEvent | undefined>;
  beforeTaskEventCreated?: (
    input: SokosumiBeforeTaskEventCreatedInput<
      SokosumiTaskEvent,
      SokosumiTaskSnapshot,
      TTaskEvent
    > & { client: TClient }
  ) => Awaitable<TTaskEvent | undefined>;
  afterTaskEventCreated?: (
    input: SokosumiAfterTaskEventCreatedInput<
      SokosumiTaskEvent,
      SokosumiTaskSnapshot,
      TTaskEvent,
      SokosumiWorkerCreatedTaskEvent<TClient>
    > & { client: TClient }
  ) => Awaitable<unknown>;
} & SokosumiTaskContextResolverOption<
  SokosumiTaskEvent,
  SokosumiTaskSnapshot,
  TClient,
  TTaskContext,
  TTrace
> & SokosumiAgentWorkerClientOption<TClient> & SokosumiAgentWorkerTaskHandlerOption<
  TTaskContext,
  TTaskEvent,
  TClient,
  TTrace
>;

export type SokosumiAgentWorkerRuntime<TClient = SokosumiHttpClient> = {
  client: TClient;
  poller: SokosumiTaskPoller;
};

export function startSokosumiAgentWorker(): SokosumiAgentWorkerRuntime<SokosumiHttpClient> | undefined;
export function startSokosumiAgentWorker<
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TClient extends SokosumiTaskPollerClient = SokosumiHttpClient,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
>(
  options: SokosumiAgentWorkerOptions<TTaskContext, TTaskEvent, TClient, TTrace>
): SokosumiAgentWorkerRuntime<TClient> | undefined;
export function startSokosumiAgentWorker<
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TClient extends SokosumiTaskPollerClient = SokosumiHttpClient,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
>({
  enabled,
  apiUrl,
  apiKey,
  intervalMs = 15000,
  limit = 20,
  maxPages = 10,
  logger = console,
  runningComment = "The coworker picked up this task.",
  canceledComment = "The coworker canceled this task.",
  bootstrapComment,
  inputRequiredTimeoutMs,
  createTaskHandler,
  createTrace,
  resolveTaskContext,
  createStaleInputRequiredEvent,
  beforeTaskEventCreated,
  afterTaskEventCreated,
  client: providedClient
}: SokosumiAgentWorkerOptions<
  TTaskContext,
  TTaskEvent,
  TClient,
  TTrace
> = {} as SokosumiAgentWorkerOptions<TTaskContext, TTaskEvent, TClient, TTrace>): SokosumiAgentWorkerRuntime<TClient> | undefined {
  if (!enabled) {
    log(logger, "sokosumi_task_poller_disabled");
    return undefined;
  }

  if (!apiKey && !providedClient) {
    log(logger, "sokosumi_task_poller_missing_key");
    return undefined;
  }

  const client = resolveWorkerClient(providedClient, { apiUrl, apiKey });
  const createCompletedEvent = createTaskHandler
    ? createSokosumiTaskCompletionHandler({
        client,
        logger,
        createTrace,
        resolveTaskContext,
        createTaskHandler
      })
    : ({ task }) => {
        // The conditional worker option only permits this fallback when the base event satisfies TTaskEvent.
        return createBootstrapCompletedEvent({ task, bootstrapComment }) as TTaskEvent;
      };

  const poller = createSokosumiTaskPoller<
    SokosumiTaskEvent,
    SokosumiTaskSnapshot,
    TTaskEvent,
    SokosumiWorkerCreatedTaskEvent<TClient>
  >({
    // ReturnType<TClient["createTaskEvent"]> is the created-event type, but TypeScript cannot
    // prove that relationship through the generic port; the runtime method check above protects it.
    client: client as unknown as SokosumiTaskPollerClient<
      SokosumiTaskEvent,
      SokosumiTaskSnapshot,
      SokosumiWorkerCreatedTaskEvent<TClient>
    >,
    intervalMs,
    limit,
    maxPages,
    logger,
    createRunningEvent: () => createRunningTaskEvent(runningComment),
    createCanceledEvent: () => ({
      status: SOKOSUMI_TASK_EVENT_STATUS.CANCELED,
      origin: "SOKOSUMI",
      comment: canceledComment
    }),
    inputRequiredTimeoutMs,
    createStaleInputRequiredEvent: createStaleInputRequiredEvent
      ? (input) => createStaleInputRequiredEvent({ ...input, client })
      : undefined,
    beforeTaskEventCreated: beforeTaskEventCreated
      ? (input) => beforeTaskEventCreated({ ...input, client })
      : undefined,
    afterTaskEventCreated: afterTaskEventCreated
      ? (input) => afterTaskEventCreated({ ...input, client })
      : undefined,
    createCompletedEvent
  });
  poller.start();
  return {
    client,
    poller
  };
}

export function createRunningTaskEvent(comment: string | null | undefined): SokosumiTaskEventInput {
  const normalizedComment = normalizeText(comment);
  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.RUNNING,
    origin: "SOKOSUMI",
    ...(normalizedComment ? { comment: normalizedComment } : {})
  };
}

function resolveWorkerClient<TClient extends SokosumiTaskPollerClient>(
  providedClient: TClient | undefined,
  options: { apiUrl?: string; apiKey?: string }
): TClient {
  const client = providedClient || createHttpSokosumiClient(options);
  if (
    typeof client.listCoworkerEvents !== "function" ||
    typeof client.getTask !== "function" ||
    typeof client.createTaskEvent !== "function"
  ) {
    throw new Error("Sokosumi worker client must implement listCoworkerEvents, getTask, and createTaskEvent.");
  }
  // SokosumiAgentWorkerClientOption requires custom client extensions explicitly;
  // when omitted, its conditional contract proves the HTTP client is assignable to TClient.
  return client as TClient;
}

export function createSokosumiTaskCompletionHandler<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TClient = SokosumiHttpClient,
  TTaskContext extends SokosumiTaskContext = SokosumiTaskContext,
  TTrace extends SokosumiTaskTrace = SokosumiTaskTrace
>({
  client,
  logger = console,
  createTrace,
  resolveTaskContext,
  createTaskHandler
}: SokosumiTaskCompletionHandlerOptions<
  TEvent,
  TTask,
  TTaskEvent,
  TClient,
  TTaskContext,
  TTrace
>): SokosumiTaskCompletionHandler<TEvent, TTask, TTaskEvent> {
  return async function handleSokosumiTaskCompletion(input) {
    const task = input.task;
    const event = input.event;
    const initialIdentity = resolveSokosumiIdentity(task);
    const trace = createTrace
      ? await createTrace({
          ...input,
          client,
          identity: initialIdentity
        })
      : undefined;

    await traceStep(trace, "task_received", {
      taskId: task?.id,
      triggerEventId: event?.id,
      taskStatus: task?.status,
      triggerStatus: event?.status,
      eventCount: Array.isArray(task?.events) ? task.events.length : 0,
      triggerText: getEventText(event),
      taskPrimaryText: getTaskPrimaryText(task)
    });

    const taskContext = resolveTaskContext
      ? await resolveTaskContext({
          ...input,
          client,
          trace,
          identity: initialIdentity
        })
      : {} as TTaskContext;
    if (taskContext?.traceContext && trace?.updateContext) {
      trace.updateContext(taskContext.traceContext);
    }
    if (taskContext?.traceStep) {
      await traceStep(trace, taskContext.traceStep.name, taskContext.traceStep.metadata || {}, taskContext.traceStep.options || {});
    }

    return createTaskHandler({
      ...input,
      client,
      trace,
      identity: initialIdentity,
      taskContext,
      task: {
        ...task,
        ...(taskContext?.taskPatch || {})
      }
    });
  };
}

export function getSokosumiEventText(event: SokosumiTaskEvent): string {
  return getEventText(event);
}

export function getSokosumiTaskPrimaryText(task: SokosumiTaskSnapshot): string {
  return getTaskPrimaryText(task);
}

async function traceStep(trace, step, metadata = {}, options = {}) {
  if (!trace?.step) return;

  try {
    await trace.step(step, metadata, options);
  } catch (error) {
    log(console, "sokosumi_task_trace_step_failed", { step, message: getErrorMessage(error) }, "error");
  }
}

function createBootstrapCompletedEvent({
  task,
  bootstrapComment
}: {
  task: SokosumiTaskSnapshot;
  bootstrapComment?: string;
}): SokosumiTaskEventInput {
  const taskName = task?.name || task?.title || "this task";
  const taskDescription = task?.description ? `\n\nTask description:\n${task.description}` : "";
  const comment = bootstrapComment ||
    `Sokosumi coworker bootstrap reply: I received "${taskName}" and can now respond on the task board.`;

  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.COMPLETED,
    origin: "SOKOSUMI",
    comment: `${comment}${taskDescription}`
  };
}

function getEventText(event) {
  return [event?.comment, event?.message, event?.body, event?.content, event?.description, event?.title, event?.name]
    .filter(Boolean)
    .join("\n\n");
}

function getTaskPrimaryText(task) {
  return [task?.description, task?.body, task?.content]
    .filter(Boolean)
    .join("\n\n");
}

function log(logger, event, metadata = {}, level = "log") {
  const target = typeof logger?.[level] === "function" ? logger[level] : logger?.log;
  if (!target) return;
  target.call(logger, JSON.stringify({ event, ...metadata }));
}
