import { Type } from "@earendil-works/pi-ai";
import type { PiToolDefinition, PiToolResult } from "../piTypes.js";

export const SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME = "sokosumi_comment_on_task";

export type SokosumiTaskCommentClient = {
  createTaskEvent(taskId: string, body: Record<string, unknown>): Promise<unknown>;
};

export type SokosumiCommentOnTaskInput = {
  taskId: string;
  comment: string;
};

export async function commentOnSokosumiTask(
  client: SokosumiTaskCommentClient,
  input: SokosumiCommentOnTaskInput
) {
  const taskId = normalizeRequiredText(input?.taskId, "task id");
  const comment = normalizeRequiredText(input?.comment, "comment");

  return client.createTaskEvent(taskId, {
    origin: "SOKOSUMI",
    comment
  });
}

export function createSokosumiCommentOnTaskTool(
  client: SokosumiTaskCommentClient
): PiToolDefinition {
  return {
    name: SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME,
    label: "Comment On Sokosumi Task",
    description:
      "Post a short, visible progress comment on a Sokosumi task without changing its status. Use only when the update is useful to the user.",
    parameters: Type.Object({
      taskId: Type.String({ description: "Sokosumi task id" }),
      comment: Type.String({ description: "Visible progress comment" })
    }),
    async execute(_toolCallId, params) {
      return toolResult(await commentOnSokosumiTask(client, params));
    }
  };
}

function normalizeRequiredText(value: unknown, label: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Sokosumi ${label} is required.`);
  }
  return normalized;
}

function toolResult(details: unknown): PiToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(details, null, 2)
      }
    ],
    details
  };
}
