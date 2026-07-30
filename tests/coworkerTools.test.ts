// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME,
  SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS,
  commentOnSokosumiTask,
  createSokosumiCommentOnTaskTool
} from "../src/tools/sokosumiCommentOnTask.js";
import { registerSokosumiCoworkerTools } from "../src/tools/registerSokosumiCoworkerTools.js";
import { registerSokosumiTools } from "../src/tools/registerSokosumiTools.js";
import { createMockSokosumiClient } from "../src/client/mockSokosumiClient.js";

test("status-neutral comment tool posts a visible Sokosumi task comment", async () => {
  const requests = [];
  const client = {
    async createTaskEvent(taskId, body) {
      requests.push({ taskId, body });
      return {
        id: "event-progress-1",
        taskId,
        ...body
      };
    }
  };
  const tool = createSokosumiCommentOnTaskTool(client);

  const result = await tool.execute("tool-call-1", {
    taskId: "task-1",
    comment: "I’m checking the connected account."
  });

  assert.equal(tool.name, SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME);
  assert.equal(tool.parameters, SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS);
  assert.deepEqual(tool.parameters.required, ["taskId", "comment"]);
  assert.equal("status" in tool.parameters.properties, false);
  assert.deepEqual(requests, [
    {
      taskId: "task-1",
      body: {
        origin: "SOKOSUMI",
        comment: "I’m checking the connected account."
      }
    }
  ]);
  assert.deepEqual(result.details, {
    id: "event-progress-1",
    taskId: "task-1",
    origin: "SOKOSUMI",
    comment: "I’m checking the connected account."
  });
});

test("status-neutral comment operation validates input before the provider request", async () => {
  let requestCount = 0;
  const client = {
    async createTaskEvent() {
      requestCount += 1;
      return {};
    }
  };

  await assert.rejects(
    commentOnSokosumiTask(client, {
      taskId: "",
      comment: "Still working."
    }),
    /task id is required/i
  );
  await assert.rejects(
    commentOnSokosumiTask(client, {
      taskId: "task-1",
      comment: "   "
    }),
    /comment is required/i
  );
  assert.equal(requestCount, 0);
});

test("coworker tool registration exposes the status-neutral comment tool to every agent", () => {
  const tools = [];
  registerSokosumiCoworkerTools(
    {
      registerTool(tool) {
        tools.push(tool);
      }
    },
    {
      async getCurrentCoworker() {},
      async listCoworkerEvents() {},
      async getTask() {},
      async createTaskEvent() {},
      async createCoworkerUsage() {}
    }
  );

  const commentTool = tools.find((tool) => tool.name === SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME);
  assert.ok(commentTool);
  assert.equal("status" in commentTool.parameters.properties, false);
});

test("mock and real coworker registrars expose the same progress-comment interface", async () => {
  const client = createMockSokosumiClient();
  const task = await client.createTask({ title: "Mock progress" });
  const tools = [];
  registerSokosumiTools(
    {
      registerTool(tool) {
        tools.push(tool);
      }
    },
    client
  );

  const commentTool = tools.find((tool) => tool.name === SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME);
  assert.ok(commentTool);
  assert.equal(commentTool.parameters, SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS);
  assert.equal("body" in commentTool.parameters.properties, false);

  await commentTool.execute("mock-progress-1", {
    taskId: task.id,
    comment: "Mock progress is visible."
  });

  const updated = await client.getTask(task.id);
  assert.equal(updated.comments.length, 1);
  assert.equal(updated.comments[0].body, "Mock progress is visible.");
  assert.equal(updated.status, "draft");
});
