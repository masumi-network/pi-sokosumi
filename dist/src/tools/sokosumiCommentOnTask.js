import { Type } from "@earendil-works/pi-ai";
import { createJsonToolResult } from "./createJsonToolResult.js";
export const SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME = "sokosumi_comment_on_task";
export const SOKOSUMI_COMMENT_ON_TASK_TOOL_LABEL = "Comment On Sokosumi Task";
export const SOKOSUMI_COMMENT_ON_TASK_TOOL_DESCRIPTION = "Post a short, visible progress comment on a Sokosumi task without changing its status. Use only when the update is useful to the user.";
export const SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS = Type.Object({
    taskId: Type.String({ description: "Sokosumi task id" }),
    comment: Type.String({ description: "Visible progress comment" })
});
export async function commentOnSokosumiTask(client, input) {
    const taskId = normalizeRequiredText(input?.taskId, "task id");
    const comment = normalizeRequiredText(input?.comment, "comment");
    return client.createTaskEvent(taskId, {
        origin: "SOKOSUMI",
        comment
    });
}
export function createSokosumiCommentOnTaskTool(client) {
    return {
        name: SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME,
        label: SOKOSUMI_COMMENT_ON_TASK_TOOL_LABEL,
        description: SOKOSUMI_COMMENT_ON_TASK_TOOL_DESCRIPTION,
        parameters: SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS,
        async execute(_toolCallId, params) {
            return createJsonToolResult(await commentOnSokosumiTask(client, params));
        }
    };
}
function normalizeRequiredText(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) {
        throw new Error(`Sokosumi ${label} is required.`);
    }
    return normalized;
}
//# sourceMappingURL=sokosumiCommentOnTask.js.map