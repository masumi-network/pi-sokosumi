// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import { createSokosumiTaskPoller } from "../src/poller/createSokosumiTaskPoller.js";
import { createRunningTaskEvent } from "../src/worker/startSokosumiAgentWorker.js";

test("Sokosumi worker omits running comment when claim comment is empty", () => {
  assert.deepEqual(createRunningTaskEvent(""), {
    status: "RUNNING",
    origin: "SOKOSUMI"
  });
  assert.deepEqual(createRunningTaskEvent("  Coworker picked up this task.  "), {
    status: "RUNNING",
    origin: "SOKOSUMI",
    comment: "Coworker picked up this task."
  });
});

test("Sokosumi poller processes READY events and writes running/completed events", async () => {
  const createdEvents: any[] = [];
  const task = {
    id: "task-1",
    status: "READY",
    events: [
      {
        id: "event-1",
        taskId: "task-1",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Please process this task."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: {
      async listCoworkerEvents() {
        return {
          events: task.events,
          pagination: {}
        };
      },
      async getTask(id: string) {
        assert.equal(id, "task-1");
        return task;
      },
      async createTaskEvent(taskId: string, body: any) {
        createdEvents.push({ taskId, body });
        return {
          id: `created-${createdEvents.length}`,
          taskId,
          ...body
        };
      }
    },
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Done."
    })
  });

  await poller.tick();

  assert.equal(createdEvents.length, 2);
  assert.equal(createdEvents[0].body.status, "RUNNING");
  assert.equal(createdEvents[1].body.status, "COMPLETED");
  assert.equal(createdEvents[1].body.comment, "Done.");
});

test("Sokosumi poller runs after-task-event hook after final task event is created", async () => {
  const createdEvents: any[] = [];
  const hookCalls: any[] = [];
  const task = {
    id: "task-hook",
    status: "READY",
    events: [
      {
        id: "event-hook",
        taskId: "task-hook",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Please process this task."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Done."
    }),
    afterTaskEventCreated: async (input) => {
      hookCalls.push(input);
    }
  });

  await poller.tick();

  assert.equal(createdEvents.length, 2);
  assert.equal(hookCalls.length, 1);
  assert.equal(hookCalls[0].taskId, "task-hook");
  assert.equal(hookCalls[0].taskEvent.status, "COMPLETED");
  assert.equal(hookCalls[0].createdTaskEvent.id, "created-2");
});

test("Sokosumi poller can transform the final task event before posting it", async () => {
  const createdEvents: any[] = [];
  const hookCalls: any[] = [];
  const task = {
    id: "task-transform",
    status: "READY",
    events: [
      {
        id: "event-transform",
        taskId: "task-transform",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Please process this task."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Done."
    }),
    beforeTaskEventCreated: async (input) => ({
      ...input.taskEvent,
      metadata: {
        transformed: true
      }
    }),
    afterTaskEventCreated: async (input) => {
      hookCalls.push(input);
    }
  });

  await poller.tick();

  assert.equal(createdEvents.length, 2);
  assert.deepEqual(createdEvents[1].body.metadata, { transformed: true });
  assert.deepEqual(hookCalls[0].taskEvent.metadata, { transformed: true });
});

test("Sokosumi poller handles cancellation once and skips duplicate cancel progress", async () => {
  const createdEvents: any[] = [];
  const task = {
    id: "task-cancel",
    status: "CANCEL_REQUESTED",
    events: [
      {
        id: "event-cancel",
        taskId: "task-cancel",
        status: "CANCEL_REQUESTED",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Stop this task."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    logger: { log() {}, error() {} }
  });

  await poller.tick();
  await poller.tick();

  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].body.status, "CANCELED");
  assert.equal(createdEvents[0].body.origin, "SOKOSUMI");
});

test("Sokosumi poller reopens terminal tasks when users add new input", async () => {
  const createdEvents: any[] = [];
  const task = {
    id: "task-restart",
    status: "COMPLETED",
    events: [
      {
        id: "event-completed",
        taskId: "task-restart",
        status: "COMPLETED",
        origin: "SOKOSUMI",
        coworkerId: "coworker-1",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Done."
      },
      {
        id: "event-user-input",
        taskId: "task-restart",
        origin: "USER",
        createdAt: "2026-05-19T10:05:00.000Z",
        comment: "Actually use this updated copy."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Updated task done."
    })
  });

  await poller.tick();

  assert.deepEqual(
    createdEvents.map((event) => event.body.status),
    ["READY", "RUNNING", "COMPLETED"]
  );
  assert.match(createdEvents[0].body.comment, /reopened/i);
  assert.equal(createdEvents[2].body.comment, "Updated task done.");
});

test("Sokosumi poller completes stale input-required tasks through event hooks", async () => {
  const createdEvents: any[] = [];
  const hookCalls: any[] = [];
  const task = {
    id: "task-stale-input",
    status: "INPUT_REQUIRED",
    events: [
      {
        id: "event-ready-stale",
        taskId: "task-stale-input",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Please process this."
      },
      {
        id: "event-input-required-stale",
        taskId: "task-stale-input",
        status: "INPUT_REQUIRED",
        origin: "SOKOSUMI",
        coworkerId: "coworker-1",
        createdAt: "2026-05-20T10:00:00.000Z",
        comment: "Please clarify."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    inputRequiredTimeoutMs: 3 * 24 * 60 * 60 * 1000,
    now: () => new Date("2026-05-24T10:00:01.000Z"),
    logger: { log() {}, warn() {}, error() {} },
    createStaleInputRequiredEvent: async ({ inputRequiredEvent }) => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: `Closing ${inputRequiredEvent.id}.`
    }),
    beforeTaskEventCreated: async (input) => ({
      ...input.taskEvent,
      masumiPayment: {
        id: "payment-stale"
      }
    }),
    afterTaskEventCreated: async (input) => {
      hookCalls.push(input);
    }
  });

  await poller.tick();

  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].body.status, "COMPLETED");
  assert.equal(createdEvents[0].body.masumiPayment.id, "payment-stale");
  assert.equal(hookCalls.length, 1);
  assert.equal(hookCalls[0].event.id, "event-input-required-stale");
  assert.equal(hookCalls[0].taskEvent.masumiPayment.id, "payment-stale");
});

test("Sokosumi poller falls back to comment-only events on invalid terminal transitions", async () => {
  const attempts: any[] = [];
  const createdEvents: any[] = [];
  const task = {
    id: "task-fallback",
    status: "READY",
    events: [
      {
        id: "event-ready",
        taskId: "task-fallback",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Process this."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({
      task,
      createdEvents,
      async createTaskEvent(taskId: string, body: any) {
        attempts.push({ taskId, body });
        if (body.status === "COMPLETED") {
          throw new Error("invalid status transition");
        }
        const created = { id: `created-${createdEvents.length + 1}`, taskId, ...body };
        createdEvents.push({ taskId, body, created });
        return created;
      }
    }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Completion text should still be posted."
    })
  });

  await poller.tick();

  assert.deepEqual(
    attempts.map((event) => event.body.status || "comment-only"),
    ["RUNNING", "COMPLETED", "comment-only"]
  );
  assert.deepEqual(
    createdEvents.map((event) => event.body.status || "comment-only"),
    ["RUNNING", "comment-only"]
  );
  assert.equal(createdEvents[1].body.comment, "Completion text should still be posted.");
});

test("Sokosumi poller strips Masumi payment data from comment-only fallback events", async () => {
  const attempts: any[] = [];
  const createdEvents: any[] = [];
  const task = {
    id: "task-payment-fallback",
    status: "READY",
    events: [
      {
        id: "event-payment-fallback",
        taskId: "task-payment-fallback",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Process this."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({
      task,
      createdEvents,
      async createTaskEvent(taskId: string, body: any) {
        attempts.push({ taskId, body });
        if (body.status === "COMPLETED") {
          throw new Error("invalid status transition");
        }
        if (body.masumiPayment) {
          throw new Error("masumiPayment is only allowed when status is COMPLETED");
        }
        const created = { id: `created-${createdEvents.length + 1}`, taskId, ...body };
        createdEvents.push({ taskId, body, created });
        return created;
      }
    }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Completion text should still be posted.",
      masumiPayment: {
        id: "payment-comment-fallback"
      }
    })
  });

  await poller.tick();

  assert.deepEqual(
    attempts.map((event) => event.body.status || "comment-only"),
    ["RUNNING", "COMPLETED", "comment-only"]
  );
  assert.equal(createdEvents[1].body.comment, "Completion text should still be posted.");
  assert.equal(createdEvents[1].body.masumiPayment, undefined);
});

test("Sokosumi poller strips Masumi payment data from comment-only terminal follow-ups", async () => {
  const createdEvents: any[] = [];
  const task = {
    id: "task-comment-only-payment",
    status: "in_progress",
    events: [
      {
        id: "event-completed-before",
        taskId: "task-comment-only-payment",
        status: "COMPLETED",
        origin: "SOKOSUMI",
        coworkerId: "coworker-1",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Done."
      },
      {
        id: "event-user-follow-up",
        taskId: "task-comment-only-payment",
        origin: "USER",
        createdAt: "2026-05-19T10:05:00.000Z",
        comment: "One more note."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({
      task,
      createdEvents,
      async createTaskEvent(taskId: string, body: any) {
        if (body.masumiPayment) {
          throw new Error("masumiPayment is only allowed when status is COMPLETED");
        }
        const created = { id: `created-${createdEvents.length + 1}`, taskId, ...body };
        createdEvents.push({ taskId, body, created });
        return created;
      }
    }),
    intervalMs: 1000,
    logger: { log() {}, error() {} },
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Comment text should still be posted.",
      masumiPayment: {
        id: "payment-comment-only"
      }
    })
  });

  await poller.tick();

  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].body.status, undefined);
  assert.equal(createdEvents[0].body.comment, "Comment text should still be posted.");
  assert.equal(createdEvents[0].body.masumiPayment, undefined);
});

test("Sokosumi poller marks the task failed when coworker processing throws after prior completion", async () => {
  const createdEvents: any[] = [];
  const logs: any[] = [];
  const task = {
    id: "task-failed-after-completion",
    status: "in_progress",
    events: [
      {
        id: "event-completed-before-failure",
        taskId: "task-failed-after-completion",
        status: "COMPLETED",
        origin: "SOKOSUMI",
        coworkerId: "coworker-1",
        createdAt: "2026-05-19T10:00:00.000Z",
        comment: "Done."
      },
      {
        id: "event-user-after-completion",
        taskId: "task-failed-after-completion",
        origin: "USER",
        createdAt: "2026-05-19T10:05:00.000Z",
        comment: "Continue this task."
      }
    ]
  };
  const poller = createSokosumiTaskPoller({
    client: createSingleTaskClient({ task, createdEvents }),
    intervalMs: 1000,
    logger: createJsonLogger(logs),
    createCompletedEvent: async () => {
      throw new Error("provider unavailable");
    }
  });

  await poller.tick();

  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].body.status, "FAILED");
  assert.match(createdEvents[0].body.comment, /provider unavailable/);
  assert.ok(logs.some((entry) => entry.event === "sokosumi_task_event_error"));
});

test("Sokosumi poller skips missing task snapshots without blocking valid events", async () => {
  const createdEvents: any[] = [];
  const logs: any[] = [];
  const getTaskCalls: string[] = [];
  const validTask = {
    id: "task-valid",
    status: "READY",
    events: [
      {
        id: "event-valid",
        taskId: "task-valid",
        status: "READY",
        origin: "USER",
        createdAt: "2026-05-19T10:01:00.000Z",
        comment: "Process this valid task."
      }
    ]
  };
  const events = [
    {
      id: "event-missing",
      taskId: "task-missing",
      status: "READY",
      origin: "USER",
      createdAt: "2026-05-19T10:00:00.000Z",
      comment: "This task no longer exists."
    },
    validTask.events[0]
  ];
  const poller = createSokosumiTaskPoller({
    client: {
      async listCoworkerEvents() {
        return {
          events,
          pagination: {}
        };
      },
      async getTask(id: string) {
        getTaskCalls.push(id);
        if (id === "task-missing") throw new Error("Task not found (404)");
        assert.equal(id, "task-valid");
        return validTask;
      },
      async createTaskEvent(taskId: string, body: any) {
        createdEvents.push({ taskId, body });
        return {
          id: `created-${createdEvents.length}`,
          taskId,
          ...body
        };
      }
    },
    intervalMs: 1000,
    logger: createJsonLogger(logs),
    createCompletedEvent: async () => ({
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Valid task done."
    })
  });

  await poller.tick();
  await poller.tick();

  assert.deepEqual(
    createdEvents.map((item) => [item.taskId, item.body.status]),
    [
      ["task-valid", "RUNNING"],
      ["task-valid", "COMPLETED"]
    ]
  );
  assert.ok(logs.some((item) => item.event === "sokosumi_task_snapshot_missing" && item.taskId === "task-missing"));
  assert.ok(logs.some((item) => item.event === "sokosumi_task_missing_skipped" && item.eventId === "event-missing"));
  assert.ok(!logs.some((item) => item.event === "sokosumi_task_poller_error"));
  assert.deepEqual(getTaskCalls, ["task-missing", "task-valid"]);
});

function createSingleTaskClient({ task, createdEvents, createTaskEvent } = {}) {
  return {
    async listCoworkerEvents() {
      return {
        events: task.events,
        pagination: {}
      };
    },
    async getTask(id: string) {
      assert.equal(id, task.id);
      return task;
    },
    async createTaskEvent(taskId: string, body: any) {
      if (createTaskEvent) return createTaskEvent(taskId, body);
      const created = {
        id: `created-${createdEvents.length + 1}`,
        taskId,
        ...body
      };
      createdEvents.push({ taskId, body, created });
      return created;
    }
  };
}

function createJsonLogger(logs: any[]) {
  const push = (line: string) => logs.push(JSON.parse(line));
  return {
    log: push,
    warn: push,
    error: push
  };
}
