// @ts-nocheck
import {
  SOKOSUMI_TASK_EVENT_STATUS,
  isSokosumiCanceledTaskEventStatus,
  isSokosumiCoworkerProgressStatus,
  isSokosumiTerminalTaskEventStatus,
  normalizeSokosumiTaskStatus
} from "../client/types.js";

export function createSokosumiTaskPoller({
  client,
  intervalMs = 15000,
  limit = 20,
  maxPages = 10,
  logger = console,
  shouldProcessEvent = defaultShouldProcessEvent,
  hasTaskProgress = defaultHasTaskProgress,
  createReopenedEvent = defaultCreateReopenedEvent,
  createRunningEvent = defaultCreateRunningEvent,
  createCanceledEvent = defaultCreateCanceledEvent,
  createCompletedEvent,
  createFailedEvent = defaultCreateFailedEvent,
  createStaleInputRequiredEvent,
  inputRequiredTimeoutMs = 0,
  now = () => new Date(),
  beforeTaskEventCreated,
  afterTaskEventCreated
}) {
  const processedEventIds = new Set();
  const canceledTaskIds = new Set();
  const completedStaleInputRequiredTaskIds = new Set();
  let running = false;
  let timer;
  let backlogCursor;

  return {
    start() {
      log(logger, "sokosumi_task_poller_started", { intervalMs });
      void tick();
      timer = setInterval(() => void tick(), intervalMs);
    },

    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },

    async tick() {
      await tick();
    }
  };

  async function tick() {
    if (running) return;
    running = true;

    try {
      await scanEventPages();
    } catch (error) {
      log(logger, "sokosumi_task_poller_error", { message: error.message }, "error");
    } finally {
      running = false;
    }
  }

  async function scanEventPages() {
    const eventsToProcess = [];
    const resumeCursor = backlogCursor;
    const headPageBudget = backlogCursor ? Math.min(2, Math.max(0, maxPages - 1)) : maxPages;

    if (headPageBudget > 0) {
      const headScan = await collectEventPages({ cursor: undefined, pageLimit: headPageBudget });
      eventsToProcess.push(...headScan.events);
      if (!backlogCursor) backlogCursor = headScan.nextCursor;
    }

    if (resumeCursor) {
      const backlogPageBudget = Math.max(1, maxPages - headPageBudget);
      const backlogScan = await collectEventPages({ cursor: resumeCursor, pageLimit: backlogPageBudget });
      eventsToProcess.push(...backlogScan.events);
      backlogCursor = backlogScan.nextCursor;
    }

    if (backlogCursor) {
      log(logger, "sokosumi_task_poller_page_limit_reached", { maxPages, nextCursor: backlogCursor });
    }

    eventsToProcess.sort(compareEventsOldestFirst);
    const taskSnapshots = await loadTaskSnapshots(eventsToProcess);
    for (const event of eventsToProcess) {
      try {
        await handleEvent(event, taskSnapshots);
      } catch (error) {
        log(logger, "sokosumi_task_event_error", { eventId: event?.id, taskId: event?.taskId, message: error.message }, "error");
      }
    }
    await handleStaleInputRequiredTasks(eventsToProcess, taskSnapshots);
  }

  async function collectEventPages({ cursor, pageLimit }) {
    const eventsToProcess = [];
    let currentCursor = cursor;
    let page = 0;

    do {
      page += 1;
      const { events, pagination } = await client.listCoworkerEvents({ limit, cursor: currentCursor });
      if (Array.isArray(events)) eventsToProcess.push(...events);

      const nextCursor = pagination?.nextCursor;
      currentCursor = nextCursor && nextCursor !== currentCursor ? nextCursor : undefined;
    } while (currentCursor && page < pageLimit);

    return {
      events: eventsToProcess,
      nextCursor: currentCursor
    };
  }

  async function loadTaskSnapshots(events) {
    const snapshots = new Map();
    const taskIds = [
      ...new Set(
        events
          .filter((event) => event?.id && !processedEventIds.has(event.id))
          .map((event) => event?.taskId)
          .filter(Boolean)
      )
    ];

    for (const taskId of taskIds) {
      try {
        const task = await client.getTask(taskId);
        snapshots.set(taskId, task ? cloneTaskSnapshot(task) : createMissingTaskSnapshot("Task snapshot was empty."));
      } catch (error) {
        if (isTaskNotFoundError(error)) {
          snapshots.set(taskId, createMissingTaskSnapshot(error?.message || "Task not found."));
          log(logger, "sokosumi_task_snapshot_missing", { taskId, message: error?.message || String(error) }, "warn");
          continue;
        }
        throw error;
      }
    }

    return snapshots;
  }

  async function handleEvent(event, taskSnapshots) {
    if (!event?.id) return;
    if (!event.taskId) {
      processedEventIds.add(event.id);
      return;
    }
    if (processedEventIds.has(event.id)) return;

    const task = taskSnapshots?.has(event.taskId) ? taskSnapshots.get(event.taskId) : await client.getTask(event.taskId);
    if (!task || isMissingTaskSnapshot(task)) {
      processedEventIds.add(event.id);
      log(logger, "sokosumi_task_missing_skipped", {
        eventId: event.id,
        taskId: event.taskId,
        message: task?.message || "Task snapshot was unavailable."
      }, "warn");
      return;
    }

    if (isCancelRequestedTaskEvent(event, task)) {
      await handleCancelRequestedEvent(event, task);
      processedEventIds.add(event.id);
      return;
    }

    if (isTerminalTaskProgress(task?.status) && !isRestartInputEvent(event, task)) {
      processedEventIds.add(event.id);
      log(logger, "sokosumi_task_terminal_skipped", { eventId: event.id, taskId: event.taskId, taskStatus: task?.status });
      return;
    }
    const restartInput = isRestartInputEvent(event, task);
    if (restartInput) {
      log(logger, "sokosumi_task_terminal_restart_requested", { eventId: event.id, taskId: event.taskId, taskStatus: task?.status });
    }

    if (!shouldProcessEvent(event, task)) {
      return;
    }

    log(logger, "sokosumi_task_ready", { eventId: event.id, taskId: event.taskId });

    if (hasTaskProgress(task, event)) {
      processedEventIds.add(event.id);
      log(logger, "sokosumi_task_already_processed", { eventId: event.id, taskId: event.taskId });
      return;
    }

    let activeTask = task;

    try {
      const commentOnly = shouldCreateCommentOnlyEvent(task, event);
      if (restartInput) {
        const reopenedEvent = createReopenedEvent ? await createReopenedEvent({ event, task }) : undefined;
        if (reopenedEvent) {
          const createdReopenedEvent = await createTaskEventOrSkipInvalidStatus(event.taskId, reopenedEvent, event);
          if (createdReopenedEvent) activeTask = appendCreatedTaskEvent(activeTask, event.taskId, createdReopenedEvent, reopenedEvent);
        }
      }

      if (!commentOnly) {
        const runningEvent = createRunningEvent ? await createRunningEvent({ event, task: activeTask }) : undefined;
        if (runningEvent) await createTaskEventOrSkipInvalidStatus(event.taskId, runningEvent, event);
      }

      const completedEvent = createCompletedEvent ? await createCompletedEvent({ event, task: activeTask }) : undefined;
      let taskEvent = commentOnly ? toCommentOnlyTaskEvent(completedEvent) : completedEvent;
      if (taskEvent) {
        taskEvent = await prepareTaskEventForCreate({
          event,
          task: activeTask,
          taskId: event.taskId,
          taskEvent
        });
        const createdTaskEvent = await createTaskEventWithCommentFallback(event.taskId, taskEvent, event);
        await notifyAfterTaskEventCreated({
          event,
          task: activeTask,
          taskId: event.taskId,
          taskEvent,
          createdTaskEvent
        });
      }

      log(logger, taskEvent ? "sokosumi_task_completed" : "sokosumi_task_claimed", {
        eventId: event.id,
        taskId: event.taskId
      });
      processedEventIds.add(event.id);
    } catch (error) {
      const failedEvent = await createFailedEvent({ event, task: activeTask, error });
      if (failedEvent) await createTaskEventWithCommentFallback(event.taskId, failedEvent, event, { allowCommentFallback: false });
      throw error;
    }
  }

  async function createTaskEventOrSkipInvalidStatus(taskId, body, triggerEvent) {
    try {
      return await client.createTaskEvent(taskId, body);
    } catch (error) {
      if (isInvalidStatusTransitionError(error) && body?.status) {
        log(
          logger,
          "sokosumi_task_status_transition_skipped",
          { eventId: triggerEvent?.id, taskId, status: body.status, reason: "invalid_status_transition" }
        );
        return undefined;
      }
      throw error;
    }
  }

  async function createTaskEventWithCommentFallback(taskId, body, triggerEvent, { allowCommentFallback = true } = {}) {
    try {
      return await client.createTaskEvent(taskId, body);
    } catch (error) {
      if (allowCommentFallback && isInvalidStatusTransitionError(error) && body?.status && body?.comment) {
        log(
          logger,
          "sokosumi_task_status_transition_fallback",
          { eventId: triggerEvent?.id, taskId, status: body.status, reason: "invalid_status_transition" }
        );
        const { status, masumiPayment, ...commentOnlyBody } = body;
        return client.createTaskEvent(taskId, commentOnlyBody);
      }
      throw error;
    }
  }

  async function handleCancelRequestedEvent(event, task) {
    if (canceledTaskIds.has(event.taskId) || hasTaskCancellationProgress(task, event)) {
      log(logger, "sokosumi_task_cancel_already_processed", { eventId: event.id, taskId: event.taskId });
      return;
    }

    log(logger, "sokosumi_task_cancel_requested", { eventId: event.id, taskId: event.taskId });
    const canceledEvent = createCanceledEvent ? await createCanceledEvent({ event, task }) : undefined;
    if (canceledEvent) await client.createTaskEvent(event.taskId, canceledEvent);
    canceledTaskIds.add(event.taskId);
    log(logger, canceledEvent ? "sokosumi_task_canceled" : "sokosumi_task_cancel_claimed", {
      eventId: event.id,
      taskId: event.taskId
    });
  }

  async function handleStaleInputRequiredTasks(events, taskSnapshots) {
    if (!createStaleInputRequiredEvent || !Number.isFinite(Number(inputRequiredTimeoutMs)) || Number(inputRequiredTimeoutMs) <= 0) {
      return;
    }

    const taskIds = [
      ...new Set(
        events
          .map((event) => event?.taskId)
          .filter(Boolean)
      )
    ];

    for (const taskId of taskIds) {
      if (completedStaleInputRequiredTaskIds.has(taskId)) continue;
      let task = taskSnapshots?.get(taskId);
      if (!task || isMissingTaskSnapshot(task)) {
        try {
          task = await client.getTask(taskId);
        } catch (error) {
          log(logger, "sokosumi_stale_input_task_load_failed", { taskId, message: error.message }, "warn");
          continue;
        }
      }
      if (!task || isMissingTaskSnapshot(task) || isTerminalTaskProgress(task?.status)) continue;

      const staleInputRequiredEvent = findStaleInputRequiredEvent(task, {
        timeoutMs: Number(inputRequiredTimeoutMs),
        now: now()
      });
      if (!staleInputRequiredEvent) continue;

      const taskEvent = await createStaleInputRequiredEvent({
        task,
        event: staleInputRequiredEvent,
        inputRequiredEvent: staleInputRequiredEvent,
        now: now()
      });
      if (!taskEvent) {
        completedStaleInputRequiredTaskIds.add(taskId);
        continue;
      }

      const preparedTaskEvent = await prepareTaskEventForCreate({
        event: staleInputRequiredEvent,
        task,
        taskId,
        taskEvent
      });
      const createdTaskEvent = await createTaskEventWithCommentFallback(taskId, preparedTaskEvent, staleInputRequiredEvent);
      await notifyAfterTaskEventCreated({
        event: staleInputRequiredEvent,
        task,
        taskId,
        taskEvent: preparedTaskEvent,
        createdTaskEvent
      });
      completedStaleInputRequiredTaskIds.add(taskId);
      log(logger, "sokosumi_stale_input_required_completed", {
        taskId,
        inputRequiredEventId: staleInputRequiredEvent.id || "",
        status: preparedTaskEvent.status || ""
      });
    }
  }

  async function notifyAfterTaskEventCreated(input) {
    if (!afterTaskEventCreated) return;

    try {
      await afterTaskEventCreated(input);
    } catch (error) {
      log(
        logger,
        "sokosumi_task_after_event_hook_failed",
        {
          eventId: input?.event?.id,
          taskId: input?.taskId,
          message: error.message
        },
        "error"
      );
    }
  }

  async function prepareTaskEventForCreate(input) {
    if (!beforeTaskEventCreated) return input.taskEvent;

    try {
      const nextTaskEvent = await beforeTaskEventCreated(input);
      return nextTaskEvent || input.taskEvent;
    } catch (error) {
      log(
        logger,
        "sokosumi_task_before_event_hook_failed",
        {
          eventId: input?.event?.id,
          taskId: input?.taskId,
          message: error.message
        },
        "error"
      );
      throw error;
    }
  }
}

function defaultShouldProcessEvent(event, task) {
  if (isTerminalTaskProgress(task?.status)) return isRestartInputEvent(event, task);
  if (normalizeStatus(event.status) === SOKOSUMI_TASK_EVENT_STATUS.READY) return true;
  return isInputProvidedEvent(event, task);
}

function defaultHasTaskProgress(task, triggerEvent) {
  if (isTerminalTaskProgress(task?.status) && !isRestartInputEvent(triggerEvent, task)) return true;
  if (!Array.isArray(task?.events)) return false;

  const triggerIndex = task.events.findIndex((event) => event?.id === triggerEvent?.id);
  const allowCommentOnlyProgress = shouldTreatCommentOnlyCoworkerRepliesAsProgress(task, triggerEvent);

  return task.events.some((event, index) => {
    if (!isCoworkerEvent(event)) return false;
    if (!isAfterTriggerEvent({ event, index, triggerEvent, triggerIndex })) return false;
    if (isCoworkerProgressStatus(event.status)) return true;
    return allowCommentOnlyProgress && isCommentOnlyCoworkerProgressEvent(event);
  });
}

function isCoworkerProgressStatus(status) {
  return isSokosumiCoworkerProgressStatus(status);
}

function shouldCreateCommentOnlyEvent(task, triggerEvent) {
  if (isTerminalTaskProgress(task?.status)) return !isRestartInputEvent(triggerEvent, task);
  if (!Array.isArray(task?.events)) return false;

  const latestProgress = findLatestCoworkerProgressBeforeTrigger(task.events, triggerEvent);
  return isTerminalTaskProgress(latestProgress?.status);
}

function shouldTreatCommentOnlyCoworkerRepliesAsProgress(task, triggerEvent) {
  if (isRestartInputEvent(triggerEvent, task)) return true;
  if (!Array.isArray(task?.events)) return false;

  const latestProgress = findLatestCoworkerProgressBeforeTrigger(task.events, triggerEvent);
  return isTerminalTaskProgress(latestProgress?.status);
}

function isCoworkerEvent(event) {
  return Boolean(event?.coworkerId || event?.coworker_id || event?.coworker?.id || event?.coworker?.slug);
}

function isCommentOnlyCoworkerProgressEvent(event) {
  if (event?.status !== null && event?.status !== undefined && normalizeStatus(event.status)) return false;
  return hasUserEventPayload(event);
}

function isTerminalTaskProgress(status) {
  return isSokosumiTerminalTaskEventStatus(status);
}

function isCancelRequestedTaskEvent(event, task) {
  if (isCanceledStatus(task?.status)) return false;
  return isCancelRequestedStatus(event?.status) || isCancelRequestedStatus(task?.status);
}

function isCancelRequestedStatus(status) {
  return normalizeStatus(status) === SOKOSUMI_TASK_EVENT_STATUS.CANCEL_REQUESTED;
}

function isCanceledStatus(status) {
  return isSokosumiCanceledTaskEventStatus(status);
}

function hasTaskCancellationProgress(task, triggerEvent) {
  if (isCanceledStatus(task?.status)) return true;
  if (!Array.isArray(task?.events)) return false;

  const triggerIndex = task.events.findIndex((event) => event?.id === triggerEvent?.id);
  return task.events.some((event, index) => {
    if (!isCanceledStatus(event?.status)) return false;
    return isAfterTriggerEvent({ event, index, triggerEvent, triggerIndex });
  });
}

function isInputProvidedEvent(event, task) {
  if (event.status !== null && event.status !== undefined) return false;
  if (event.coworkerId) return false;
  if (!hasUserEventPayload(event)) return false;
  if (!Array.isArray(task?.events)) return false;

  const latestProgress = findLatestCoworkerProgressBeforeTrigger(task.events, event);
  return Boolean(latestProgress);
}

function isRestartInputEvent(event, task) {
  if (!isTerminalTaskProgress(task?.status)) return false;
  if (event?.coworkerId) return false;
  if (!hasUserEventPayload(event)) return false;
  const status = normalizeStatus(event?.status);
  if (event?.status !== null && event?.status !== undefined && status !== SOKOSUMI_TASK_EVENT_STATUS.READY) return false;
  if (!Array.isArray(task?.events)) return false;

  const latestProgress = findLatestCoworkerProgressBeforeTrigger(task.events, event);
  return isTerminalTaskProgress(latestProgress?.status);
}

function toCommentOnlyTaskEvent(taskEvent) {
  if (!taskEvent?.status) return taskEvent;
  if (!taskEvent.comment) return undefined;

  const { status, masumiPayment, ...commentOnlyEvent } = taskEvent;
  return commentOnlyEvent;
}

function findLatestCoworkerProgressBeforeTrigger(events, triggerEvent) {
  const triggerIndex = events.findIndex((event) => event?.id === triggerEvent?.id);
  let latestProgress;
  let latestSortValue = -Infinity;

  events.forEach((event, index) => {
    if (!event?.coworkerId) return;
    if (!isCoworkerProgressStatus(event.status)) return;
    if (!isBeforeTriggerEvent({ event, index, triggerEvent, triggerIndex })) return;

    const sortValue = getEventTimestamp(event) ?? index;
    if (sortValue > latestSortValue) {
      latestSortValue = sortValue;
      latestProgress = event;
    }
  });

  return latestProgress;
}

function findStaleInputRequiredEvent(task, { timeoutMs, now }) {
  if (!Array.isArray(task?.events)) return null;
  const latestProgress = findLatestCoworkerProgressEvent(task.events);
  if (normalizeStatus(latestProgress?.status) !== SOKOSUMI_TASK_EVENT_STATUS.INPUT_REQUIRED) return null;
  if (hasUserPayloadAfterEvent(task.events, latestProgress)) return null;

  const progressTime = getEventTimestamp(latestProgress);
  const nowTime = getEventTimestamp({ createdAt: now });
  if (progressTime === undefined || nowTime === undefined) return null;
  if (nowTime - progressTime < timeoutMs) return null;
  return latestProgress;
}

function findLatestCoworkerProgressEvent(events) {
  let latestProgress;
  let latestSortValue = -Infinity;

  events.forEach((event, index) => {
    if (!isCoworkerEvent(event)) return;
    if (!isCoworkerProgressStatus(event.status)) return;

    const sortValue = getEventTimestamp(event) ?? index;
    if (sortValue > latestSortValue) {
      latestSortValue = sortValue;
      latestProgress = event;
    }
  });

  return latestProgress;
}

function hasUserPayloadAfterEvent(events, progressEvent) {
  const progressIndex = events.findIndex((event) => event?.id && event.id === progressEvent?.id);
  return events.some((event, index) => {
    if (isCoworkerEvent(event)) return false;
    if (!hasUserEventPayload(event)) return false;
    return isAfterTriggerEvent({
      event,
      index,
      triggerEvent: progressEvent,
      triggerIndex: progressIndex
    });
  });
}

function isAfterTriggerEvent({ event, index, triggerEvent, triggerIndex }) {
  const eventTime = getEventTimestamp(event);
  const triggerTime = getEventTimestamp(triggerEvent);

  if (eventTime !== undefined && triggerTime !== undefined) {
    return eventTime > triggerTime;
  }

  if (triggerIndex >= 0) {
    return index > triggerIndex;
  }

  return false;
}

function isBeforeTriggerEvent({ event, index, triggerEvent, triggerIndex }) {
  const eventTime = getEventTimestamp(event);
  const triggerTime = getEventTimestamp(triggerEvent);

  if (eventTime !== undefined && triggerTime !== undefined) {
    return eventTime < triggerTime;
  }

  if (triggerIndex >= 0) {
    return index < triggerIndex;
  }

  return false;
}

function getEventTimestamp(event) {
  const value = event?.createdAt || event?.created_at || event?.timestamp || event?.updatedAt || event?.updated_at;
  if (!value) return undefined;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function hasUserEventPayload(event) {
  return Boolean(
    event?.comment ||
      event?.message ||
      event?.body ||
      event?.content ||
      event?.description ||
      event?.title ||
      event?.name ||
      hasItems(event?.attachments) ||
      hasItems(event?.media) ||
      hasItems(event?.files)
  );
}

function hasItems(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function isInvalidStatusTransitionError(error) {
  return /invalid status transition/i.test(String(error?.message || ""));
}

function normalizeStatus(status) {
  return normalizeSokosumiTaskStatus(status);
}

function cloneTaskSnapshot(task) {
  if (!task || typeof task !== "object") return task;
  return {
    ...task,
    events: Array.isArray(task.events) ? task.events.map((event) => ({ ...event })) : task.events
  };
}

function createMissingTaskSnapshot(message = "Task snapshot was unavailable.") {
  return {
    __sokosumiMissingTask: true,
    message
  };
}

function isMissingTaskSnapshot(task) {
  return Boolean(task?.__sokosumiMissingTask);
}

function isTaskNotFoundError(error) {
  const message = String(error?.message || error || "");
  return /\b(?:404|410)\b/.test(message) || /\btask\b.*\bnot found\b/i.test(message) || /\bnot found\b.*\btask\b/i.test(message);
}

function appendCreatedTaskEvent(task, taskId, createdEvent, body) {
  if (!task || typeof task !== "object") return task;
  const event = normalizeCreatedTaskEvent(taskId, createdEvent, body);
  return {
    ...task,
    status: event?.status || task.status,
    events: [...(Array.isArray(task.events) ? task.events : []), event].filter(Boolean)
  };
}

function normalizeCreatedTaskEvent(taskId, createdEvent, body = {}) {
  if (createdEvent && typeof createdEvent === "object" && !createdEvent.body) {
    return {
      taskId,
      ...body,
      ...createdEvent
    };
  }

  return {
    taskId,
    ...(body || {}),
    ...(createdEvent?.body || {})
  };
}

function compareEventsOldestFirst(left, right) {
  const leftTime = getEventTimestamp(left);
  const rightTime = getEventTimestamp(right);

  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (leftTime !== undefined && rightTime === undefined) return -1;
  if (leftTime === undefined && rightTime !== undefined) return 1;
  return 0;
}

function defaultCreateRunningEvent() {
  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.RUNNING,
    origin: "SOKOSUMI",
    comment: "The coworker picked up this task."
  };
}

function defaultCreateReopenedEvent() {
  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.READY,
    origin: "SOKOSUMI",
    comment: "The coworker reopened this task because the user added new input after it was done."
  };
}

function defaultCreateFailedEvent({ error }) {
  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.FAILED,
    origin: "SOKOSUMI",
    comment: `The coworker failed while processing this task: ${error.message}`
  };
}

function defaultCreateCanceledEvent() {
  return {
    status: SOKOSUMI_TASK_EVENT_STATUS.CANCELED,
    origin: "SOKOSUMI",
    comment: "The coworker canceled this task."
  };
}

function log(logger, event, details = {}, level = "info") {
  const entry = JSON.stringify({ event, ...details });
  if (level === "error" && logger.error) {
    logger.error(entry);
    return;
  }
  if (level === "warn" && logger.warn) {
    logger.warn(entry);
    return;
  }
  logger.log(entry);
}
