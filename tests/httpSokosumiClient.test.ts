// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import { createHttpSokosumiClient } from "../src/client/httpSokosumiClient.js";

test("HTTP Sokosumi client updates tasks with PATCH", async () => {
  const requests: any[] = [];
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test/",
    apiKey: "test-key",
    fetchImpl: async (url: string, options: any = {}) => {
      requests.push({
        url,
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.parse(options.body) : undefined
      });
      return new Response(
        JSON.stringify({
          data: sokosumiTaskResponse({ id: "task-1", status: "RUNNING" })
        }),
        { status: 200 }
      );
    }
  });

  const task = await client.updateTask({
    taskId: "task-1",
    status: "in_progress",
    title: "Updated title"
  });

  assert.equal(task.status, "RUNNING");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://sokosumi.example.test/v1/tasks/task-1");
  assert.equal(requests[0].method, "PATCH");
  assert.equal(requests[0].headers.Authorization, "Bearer test-key");
  assert.deepEqual(requests[0].body, {
    status: "in_progress",
    title: "Updated title"
  });
});

test("HTTP Sokosumi client normalizes supported coworker usage aliases", async () => {
  const requests: any[] = [];
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async (url: string, options: any = {}) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({
        data: {
          id: "usage-1",
          createdAt: "2026-08-03T10:00:00.000Z",
          updatedAt: "2026-08-03T10:00:00.000Z",
          idempotencyKey: "usage-1",
          referenceId: "task-1",
          coworkerId: "coworker-1",
          userId: "user-1",
          organizationId: "org-1",
          credits: 2.5,
          transactionId: "transaction-1"
        }
      }), { status: 200 });
    }
  });

  await client.createCoworkerUsage({
    sokosumiUserId: "user-1",
    organization_id: "org-1",
    idempotency_key: "usage-1",
    credits: 2.5,
    reference_id: "task-1"
  });

  assert.deepEqual(requests[0], {
    url: "https://sokosumi.example.test/v1/coworkers/me/usage",
    body: {
      userId: "user-1",
      organizationId: "org-1",
      idempotencyKey: "usage-1",
      credits: 2.5,
      referenceId: "task-1"
    }
  });
});

test("HTTP Sokosumi client rejects malformed external task data", async () => {
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ data: "not-a-task" }), { status: 200 })
  });

  await assert.rejects(
    client.getTask("task-1"),
    (error: any) => error?.name === "SokosumiRequestError" && error?.code === "invalid_response"
  );
});

test("HTTP Sokosumi client preserves structured HTTP failures through the shared transport", async () => {
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ message: "temporarily unavailable" }), {
      status: 503
    })
  });

  await assert.rejects(
    client.getTask("task-1"),
    (error: any) =>
      error?.name === "SokosumiRequestError" &&
      error?.code === "http_error" &&
      error?.statusCode === 503 &&
      error?.payload?.message === "temporarily unavailable"
  );
});

test("HTTP Sokosumi client accepts current task statuses and nullable response fields", async () => {
  const task = sokosumiTaskResponse({
    status: "QUEUED",
    description: null,
    metadata: JSON.stringify({ schedule: "daily" }),
    events: [sokosumiTaskEventResponse({ status: "APPROVAL_REQUIRED", comment: null })]
  });
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ data: task }), { status: 200 })
  });

  const result = await client.getTask("task-1");

  assert.equal(result?.status, "QUEUED");
  assert.equal(result?.description, null);
  assert.equal(result?.events[0].status, "APPROVAL_REQUIRED");
  assert.equal(result?.events[0].comment, null);
});

test("HTTP Sokosumi client accepts cancellation events returned by the coworker feed", async () => {
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      data: [sokosumiTaskEventResponse({ status: "CANCEL_REQUESTED" })]
    }), { status: 200 })
  });

  const result = await client.listCoworkerEvents();

  assert.equal(result.events[0].status, "CANCEL_REQUESTED");
});

test("HTTP Sokosumi client normalizes nullable pagination cursors from the coworker feed", async () => {
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      data: [],
      meta: {
        pagination: {
          nextCursor: null,
          previousCursor: null,
          hasMore: false
        }
      }
    }), { status: 200 })
  });

  const result = await client.listCoworkerEvents();

  assert.deepEqual(result.pagination, { hasMore: false });
});

test("HTTP Sokosumi client rejects non-string pagination cursors from the coworker feed", async () => {
  for (const field of ["nextCursor", "previousCursor"]) {
    const client = createHttpSokosumiClient({
      apiUrl: "https://sokosumi.example.test",
      apiKey: "test-key",
      fetchImpl: async () => new Response(JSON.stringify({
        data: [],
        meta: { pagination: { [field]: 42 } }
      }), { status: 200 })
    });

    await assert.rejects(
      client.listCoworkerEvents(),
      new RegExp(`Sokosumi pagination\\.${field} must be a string when provided\\.`)
    );
  }
});

test("HTTP Sokosumi client rejects missing required inputs before sending a request", async () => {
  let requestCount = 0;
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => {
      requestCount += 1;
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }
  });

  await assert.rejects(client.getTask("  "), /task id is required/i);
  await assert.rejects(client.getUser(""), /user id is required/i);
  await assert.rejects(client.createTaskEvent("", { comment: "Hello" }), /task id is required/i);
  await assert.rejects(client.createTaskEvent("task-1", {}), /task event body/i);

  assert.equal(requestCount, 0);
});

test("HTTP Sokosumi client trims required path ids before sending requests", async () => {
  const requests: any[] = [];
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async (url: string, options: any = {}) => {
      requests.push({ url, headers: options.headers });
      if (url.includes("/users/")) {
        return new Response(JSON.stringify({
          data: {
            id: "user-1",
            createdAt: "2026-08-03T10:00:00.000Z",
            updatedAt: "2026-08-03T10:00:00.000Z",
            name: "Ada",
            email: "ada@example.test",
            role: "user",
            emailVerified: true
          }
        }), { status: 200 });
      }
      if (url.endsWith("/events")) {
        return new Response(JSON.stringify({ data: sokosumiTaskEventResponse() }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: sokosumiTaskResponse() }), { status: 200 });
    }
  });

  await client.getTask("  task-1  ");
  await client.getUser("  user-1  ");
  await client.createTaskEvent("  task-1  ", { comment: "Hello" });

  assert.deepEqual(requests.map(({ url }) => url), [
    "https://sokosumi.example.test/v1/tasks/task-1",
    "https://sokosumi.example.test/v1/users/user-1",
    "https://sokosumi.example.test/v1/tasks/task-1/events"
  ]);
  assert.equal(requests[1].headers["X-Delegation-User-Id"], "user-1");
});

test("HTTP Sokosumi client rejects incomplete task objects", async () => {
  const client = createHttpSokosumiClient({
    apiUrl: "https://sokosumi.example.test",
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ data: {} }), { status: 200 })
  });

  await assert.rejects(
    client.getTask("task-1"),
    (error: any) => error?.code === "invalid_response" && /\.id must be a string/.test(error.message)
  );
});

function sokosumiTaskEventResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    taskId: "task-1",
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
    actor: null,
    userId: null,
    user: null,
    coworkerId: null,
    coworker: null,
    orchestratorId: null,
    orchestrator: null,
    transactionId: null,
    credits: null,
    comment: "Ready",
    authenticationUrl: null,
    channel: "SOKOSUMI",
    origin: "SOKOSUMI",
    status: "READY",
    ...overrides
  };
}

function sokosumiTaskResponse(overrides: Record<string, unknown> = {}) {
  const user = { id: "user-1", name: "Ada", image: null };
  return {
    id: "task-1",
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
    ownerId: "user-1",
    owner: user,
    userId: "user-1",
    user,
    organizationId: null,
    organization: null,
    projectId: null,
    assigneeId: null,
    assignee: null,
    coworkerId: null,
    coworker: null,
    creator: { type: "user", id: "user-1", user },
    orchestratorId: null,
    orchestrator: null,
    name: "Task",
    description: null,
    status: "READY",
    grantResumeStatus: null,
    pendingVendorGrantId: null,
    metadata: null,
    nextRunAt: null,
    credits: 1,
    events: [],
    jobs: [],
    workspace: {},
    share: null,
    links: [],
    files: [],
    ...overrides
  };
}
