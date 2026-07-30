import type { PiToolDefinition } from "../piTypes.js";
export declare const SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME = "sokosumi_comment_on_task";
export type SokosumiTaskCommentClient = {
    createTaskEvent(taskId: string, body: Record<string, unknown>): Promise<unknown>;
};
export type SokosumiCommentOnTaskInput = {
    taskId: string;
    comment: string;
};
export declare function commentOnSokosumiTask(client: SokosumiTaskCommentClient, input: SokosumiCommentOnTaskInput): Promise<unknown>;
export declare function createSokosumiCommentOnTaskTool(client: SokosumiTaskCommentClient): PiToolDefinition;
