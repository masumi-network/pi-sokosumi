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
          data: {
            id: "task-1",
            status: "in_progress"
          }
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

  assert.equal(task.status, "in_progress");
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
      return new Response(JSON.stringify({ data: { id: "usage-1" } }), { status: 200 });
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
