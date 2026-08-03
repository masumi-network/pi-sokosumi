import type { SokosumiHttpClient } from "../client/httpSokosumiClient.js";
import { type CreateCoworkerUsageInput, type SokosumiEventOrigin, type SokosumiTaskEventStatus } from "../client/types.js";
import type { PiToolRegistrationAPI } from "../piTypes.js";
export type SokosumiGetTaskToolInput = {
    taskId: string;
};
export type SokosumiCreateTaskEventToolInput = {
    taskId: string;
    status: SokosumiTaskEventStatus;
    comment?: string;
    origin?: Exclude<SokosumiEventOrigin, "USER">;
    credits?: number;
};
export type SokosumiCreateCoworkerUsageToolInput = CreateCoworkerUsageInput;
export type SokosumiCoworkerToolsClient = Pick<SokosumiHttpClient, "getCurrentCoworker" | "listCoworkerEvents" | "getTask" | "createTaskEvent" | "createCoworkerUsage">;
export declare function registerSokosumiCoworkerTools(pi: PiToolRegistrationAPI, client: SokosumiCoworkerToolsClient): void;
