import type { PiExtensionAPI } from "../piTypes.js";
type SokosumiHttpClient = {
    getCurrentCoworker(): Promise<unknown>;
    listCoworkerEvents(input?: {
        limit?: number;
        cursor?: string;
    }): Promise<unknown>;
    getTask(taskId: string): Promise<unknown>;
    createTaskEvent(taskId: string, body: Record<string, unknown>): Promise<unknown>;
    createCoworkerUsage(input: {
        userId: string;
        organizationId?: string | null;
        idempotencyKey: string;
        credits: number;
        referenceId?: string;
    }): Promise<unknown>;
};
export declare function registerSokosumiCoworkerTools(pi: PiExtensionAPI, client: SokosumiHttpClient): void;
export {};
