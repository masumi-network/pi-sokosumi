import type { SokosumiHttpClient } from "../client/httpSokosumiClient.js";
import { type CreateCoworkerUsageInput, type SokosumiEventOrigin, type SokosumiNonAuthenticationTaskEventStatus } from "../client/types.js";
import type { PiToolRegistrationAPI } from "../piTypes.js";
export type SokosumiGetTaskToolInput = {
    taskId: string;
};
type SokosumiCreateTaskEventToolInputBase = {
    taskId: string;
    comment?: string;
    origin?: SokosumiEventOrigin;
    credits?: number;
};
export type SokosumiCreateTaskEventToolInput = (SokosumiCreateTaskEventToolInputBase & {
    status: "AUTHENTICATION_REQUIRED";
    authenticationUrl: string;
}) | (SokosumiCreateTaskEventToolInputBase & {
    status: SokosumiNonAuthenticationTaskEventStatus;
    authenticationUrl?: never;
});
export type SokosumiCreateCoworkerUsageToolInput = CreateCoworkerUsageInput;
export type SokosumiCoworkerToolsClient = Pick<SokosumiHttpClient, "getCurrentCoworker" | "listCoworkerEvents" | "getTask" | "createTaskEvent" | "createCoworkerUsage">;
export declare function registerSokosumiCoworkerTools(pi: PiToolRegistrationAPI, client: SokosumiCoworkerToolsClient): void;
export {};
