import { type CreateCoworkerUsageInput, type ListSokosumiCoworkerEventsInput, type SokosumiCoworker, type SokosumiCoworkerEventPage, type SokosumiCoworkerUsage, type SokosumiDelegationOptions, type SokosumiTaskEvent, type SokosumiTaskEventInput, type SokosumiTaskSnapshot, type SokosumiUser, type UpdateTaskInput } from "./types.js";
export type SokosumiFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;
export type HttpSokosumiClientOptions = {
    apiUrl?: string;
    apiKey?: string;
    fetchImpl?: SokosumiFetch;
    timeoutMs?: number;
};
export type UpdateSokosumiTaskInput = UpdateTaskInput & Record<string, unknown>;
type CoworkerUsageUser = {
    userId: string;
    sokosumiUserId?: string;
} | {
    userId?: string;
    sokosumiUserId: string;
};
type CoworkerUsageIdempotency = {
    idempotencyKey: string;
    idempotency_key?: string;
} | {
    idempotencyKey?: string;
    idempotency_key: string;
};
export type HttpCreateCoworkerUsageInput = CoworkerUsageUser & CoworkerUsageIdempotency & {
    credits: number;
    organizationId?: string | null;
    organization_id?: string | null;
    referenceId?: string;
    reference_id?: string;
};
export type SokosumiRequestErrorCode = "http_error" | "timeout" | "invalid_response";
export declare class SokosumiRequestError extends Error {
    readonly code: SokosumiRequestErrorCode;
    readonly statusCode?: number;
    readonly payload?: unknown;
    constructor(message: string, options: {
        code: SokosumiRequestErrorCode;
        statusCode?: number;
        payload?: unknown;
        cause?: unknown;
    });
}
export type SokosumiHttpClient = {
    getCurrentCoworker(): Promise<SokosumiCoworker>;
    listCoworkerEvents(input?: ListSokosumiCoworkerEventsInput): Promise<SokosumiCoworkerEventPage>;
    getTask(taskId: string): Promise<SokosumiTaskSnapshot | undefined>;
    updateTask(input: UpdateSokosumiTaskInput): Promise<SokosumiTaskSnapshot>;
    getUser(userId: string, options?: SokosumiDelegationOptions): Promise<SokosumiUser | undefined>;
    createTaskEvent(taskId: string, body: SokosumiTaskEventInput): Promise<SokosumiTaskEvent>;
    createCoworkerUsage(input: CreateCoworkerUsageInput | HttpCreateCoworkerUsageInput): Promise<SokosumiCoworkerUsage>;
};
export declare function createHttpSokosumiClient({ apiUrl, apiKey, fetchImpl, timeoutMs }: HttpSokosumiClientOptions): SokosumiHttpClient;
export type { CreateCoworkerUsageInput, ListSokosumiCoworkerEventsInput, SokosumiCoworker, SokosumiCoworkerEventPage, SokosumiCoworkerSummary, SokosumiCoworkerUsage, SokosumiDelegationOptions, SokosumiEventChannel, SokosumiEventOrigin, SokosumiNonAuthenticationTaskEventStatus, SokosumiOrchestratorSummary, SokosumiPagination, SokosumiTaskCreator, SokosumiTaskEvent, SokosumiTaskEventActor, SokosumiTaskEventInput, SokosumiTaskLink, SokosumiTaskLinkRelation, SokosumiTaskSnapshot, SokosumiUser, SokosumiUserSummary } from "./types.js";
