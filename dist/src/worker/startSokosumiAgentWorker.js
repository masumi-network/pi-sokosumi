// @ts-nocheck
import { createHttpSokosumiClient } from "../client/httpSokosumiClient.js";
import { createSokosumiTaskPoller } from "../poller/createSokosumiTaskPoller.js";
import { resolveSokosumiIdentity } from "../identity/resolveSokosumiIdentity.js";
import { SOKOSUMI_TASK_EVENT_STATUS } from "../client/types.js";
export function startSokosumiAgentWorker({ enabled, apiUrl, apiKey, intervalMs = 15000, limit = 20, maxPages = 10, logger = console, runningComment = "The coworker picked up this task.", canceledComment = "The coworker canceled this task.", bootstrapComment, inputRequiredTimeoutMs, createTaskHandler, createTrace, resolveTaskContext, createStaleInputRequiredEvent, beforeTaskEventCreated, afterTaskEventCreated, client: providedClient } = {}) {
    if (!enabled) {
        log(logger, "sokosumi_task_poller_disabled");
        return undefined;
    }
    if (!apiKey && !providedClient) {
        log(logger, "sokosumi_task_poller_missing_key");
        return undefined;
    }
    const client = providedClient || createHttpSokosumiClient({ apiUrl, apiKey });
    const createCompletedEvent = createTaskHandler
        ? createSokosumiTaskCompletionHandler({
            client,
            logger,
            createTrace,
            resolveTaskContext,
            createTaskHandler
        })
        : ({ task }) => createBootstrapCompletedEvent({ task, bootstrapComment });
    const poller = createSokosumiTaskPoller({
        client,
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
export function createRunningTaskEvent(comment) {
    const normalizedComment = String(comment || "").trim();
    return {
        status: SOKOSUMI_TASK_EVENT_STATUS.RUNNING,
        origin: "SOKOSUMI",
        ...(normalizedComment ? { comment: normalizedComment } : {})
    };
}
export function createSokosumiTaskCompletionHandler({ client, logger = console, createTrace, resolveTaskContext, createTaskHandler } = {}) {
    return async function handleSokosumiTaskCompletion(input = {}) {
        const task = input.task || {};
        const event = input.event || {};
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
            : {};
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
export function getSokosumiEventText(event) {
    return getEventText(event);
}
export function getSokosumiTaskPrimaryText(task) {
    return getTaskPrimaryText(task);
}
async function traceStep(trace, step, metadata = {}, options = {}) {
    if (!trace?.step)
        return;
    try {
        await trace.step(step, metadata, options);
    }
    catch (error) {
        log(console, "sokosumi_task_trace_step_failed", { step, message: error.message }, "error");
    }
}
function createBootstrapCompletedEvent({ task, bootstrapComment }) {
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
    if (!target)
        return;
    target.call(logger, JSON.stringify({ event, ...metadata }));
}
//# sourceMappingURL=startSokosumiAgentWorker.js.map