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
