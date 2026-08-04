import { Type } from "@earendil-works/pi-ai";
import type { PiToolDefinition } from "../piTypes.js";
export declare const SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME = "sokosumi_comment_on_task";
export declare const SOKOSUMI_COMMENT_ON_TASK_TOOL_LABEL = "Comment On Sokosumi Task";
export declare const SOKOSUMI_COMMENT_ON_TASK_TOOL_DESCRIPTION = "Post a short, visible progress comment on a Sokosumi task without changing its status. Use only when the update is useful to the user.";
export declare const SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS: Type.TObject<{
    taskId: Type.TString;
    comment: Type.TString;
}>;
export type SokosumiTaskCommentClient<TResult = unknown> = {
    createTaskEvent(taskId: string, body: Record<string, unknown>): Promise<TResult>;
};
export type SokosumiCommentOnTaskInput = {
    taskId: string;
    comment: string;
};
export declare function commentOnSokosumiTask<TResult>(client: SokosumiTaskCommentClient<TResult>, input: SokosumiCommentOnTaskInput): Promise<TResult>;
export declare function createSokosumiCommentOnTaskTool<TResult>(client: SokosumiTaskCommentClient<TResult>): PiToolDefinition<SokosumiCommentOnTaskInput, TResult>;
