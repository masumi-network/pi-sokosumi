export type SokosumiTaskStatus = "draft" | "in_progress" | "awaiting_approval" | "done" | "failed";
export declare const SOKOSUMI_EVENT_ORIGINS: readonly ["USER", "SLACK", "TEAMS", "EMAIL", "LINEAR", "GITHUB", "WHATSAPP", "TELEGRAM", "SIGNAL", "DISCORD", "CHAT", "MESSENGER", "SOKOSUMI", "UNKNOWN"];
export type SokosumiEventOrigin = typeof SOKOSUMI_EVENT_ORIGINS[number];
export declare const SOKOSUMI_TASK_EVENT_STATUSES: readonly ["DRAFT", "READY", "INPUT_REQUIRED", "AUTHENTICATION_REQUIRED", "OUT_OF_CREDITS", "CREDITS_TOPPED_UP", "RUNNING", "AWAITING_EXTERNAL", "COMPLETED", "FAILED", "CANCEL_REQUESTED", "CANCELED"];
export type SokosumiTaskEventStatus = typeof SOKOSUMI_TASK_EVENT_STATUSES[number];
export declare const SOKOSUMI_TASK_EVENT_STATUS: Record<SokosumiTaskEventStatus, SokosumiTaskEventStatus>;
export declare const SOKOSUMI_COWORKER_PROGRESS_STATUSES: readonly ["RUNNING", "AWAITING_EXTERNAL", "INPUT_REQUIRED", "AUTHENTICATION_REQUIRED", "OUT_OF_CREDITS", "COMPLETED", "FAILED", "CANCEL_REQUESTED", "CANCELED", "CANCELLED", "DONE"];
export type SokosumiCoworkerProgressStatus = typeof SOKOSUMI_COWORKER_PROGRESS_STATUSES[number];
export declare const SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES: readonly ["COMPLETED", "FAILED", "CANCEL_REQUESTED", "CANCELED", "CANCELLED", "DONE"];
export type SokosumiTerminalTaskEventStatus = typeof SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES[number];
export declare const SOKOSUMI_CANCELED_TASK_EVENT_STATUSES: readonly ["CANCELED", "CANCELLED"];
export type SokosumiCanceledTaskEventStatus = typeof SOKOSUMI_CANCELED_TASK_EVENT_STATUSES[number];
export declare const SOKOSUMI_TASK_EVENT_DECISION_STATUSES: readonly ["COMPLETED", "INPUT_REQUIRED", "FAILED"];
export type SokosumiTaskEventDecisionStatus = typeof SOKOSUMI_TASK_EVENT_DECISION_STATUSES[number];
export type SokosumiObservedTaskStatus = SokosumiTaskStatus | SokosumiTaskEventStatus | Exclude<SokosumiCoworkerProgressStatus, SokosumiTaskEventStatus>;
export declare const SOKOSUMI_TASK_EVENT_STATUS_DECISION_PROMPT: string;
export declare function isSokosumiTaskEventStatus(status: unknown): status is SokosumiTaskEventStatus;
export declare function isSokosumiCoworkerProgressStatus(status: unknown): status is SokosumiCoworkerProgressStatus;
export declare function isSokosumiTerminalTaskEventStatus(status: unknown): status is SokosumiTerminalTaskEventStatus;
export declare function isSokosumiCanceledTaskEventStatus(status: unknown): status is SokosumiCanceledTaskEventStatus;
export declare function isSokosumiTaskEventDecisionStatus(status: unknown): status is SokosumiTaskEventDecisionStatus;
export declare function isSokosumiEventOrigin(origin: unknown): origin is SokosumiEventOrigin;
export declare function normalizeSokosumiTaskStatus(status: unknown): string;
export type SokosumiTaskComment = {
    id: string;
    body: string;
    createdAt: string;
};
export type SokosumiTaskEvent<TMetadata extends Record<string, unknown> = Record<string, unknown>> = Record<string, unknown> & {
    id?: string;
    taskId?: string;
    status?: SokosumiTaskEventStatus | Exclude<SokosumiCoworkerProgressStatus, SokosumiTaskEventStatus> | null;
    origin?: SokosumiEventOrigin | null;
    comment?: string;
    message?: string;
    body?: string;
    content?: string;
    description?: string;
    title?: string;
    name?: string;
    coworkerId?: string | null;
    coworker_id?: string | null;
    coworker?: {
        id?: string;
        slug?: string;
    } | null;
    userId?: string | null;
    user?: Record<string, unknown> | null;
    attachments?: unknown[];
    media?: unknown[];
    files?: unknown[];
    metadata?: TMetadata;
    createdAt?: string | Date;
    created_at?: string | Date;
    updatedAt?: string | Date;
    updated_at?: string | Date;
    timestamp?: string | number | Date;
};
export type SokosumiTaskEventInput<TMetadata extends Record<string, unknown> = Record<string, unknown>> = Record<string, unknown> & {
    status?: SokosumiTaskEventStatus;
    origin?: SokosumiEventOrigin;
    comment?: string;
    credits?: number;
    metadata?: TMetadata;
    masumiPayment?: unknown;
};
export type SokosumiTaskSnapshot<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TMetadata extends Record<string, unknown> = Record<string, unknown>> = Record<string, unknown> & {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    body?: string;
    content?: string;
    status?: SokosumiObservedTaskStatus | null;
    events?: TEvent[];
    metadata?: TMetadata;
    userId?: string;
    organizationId?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};
export type SokosumiTask = {
    id: string;
    title: string;
    description?: string;
    status: SokosumiTaskStatus;
    comments: SokosumiTaskComment[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
};
export type CreateTaskInput = {
    title: string;
    description?: string;
    status?: SokosumiTaskStatus;
    metadata?: Record<string, unknown>;
};
export type UpdateTaskInput = {
    taskId: string;
    title?: string;
    description?: string;
    status?: SokosumiTaskStatus;
    metadata?: Record<string, unknown>;
};
export type CommentOnTaskInput = {
    taskId: string;
    body: string;
};
export type CreateCoworkerUsageInput = {
    userId: string;
    organizationId?: string | null;
    idempotencyKey: string;
    credits: number;
    referenceId?: string;
};
export type SokosumiDelegationOptions = {
    organizationId?: string;
    organizationSlug?: string;
};
export type SokosumiPagination = {
    nextCursor?: string;
    previousCursor?: string;
    hasMore?: boolean;
} & Record<string, unknown>;
export type ListSokosumiCoworkerEventsInput = {
    limit?: number;
    cursor?: string;
};
export type SokosumiCoworkerEventPage<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent> = {
    events: TEvent[];
    pagination?: SokosumiPagination;
};
export type SokosumiCoworker = Record<string, unknown> & {
    id?: string;
    name?: string;
    slug?: string;
};
export type SokosumiUser = Record<string, unknown> & {
    id?: string;
    name?: string;
    image?: string;
    organizationId?: string | null;
};
export type SokosumiCoworkerUsage = Record<string, unknown> & {
    id?: string;
    userId?: string;
    organizationId?: string | null;
    credits?: number;
    referenceId?: string;
};
export type SokosumiClient = {
    createTask(input: CreateTaskInput): Promise<SokosumiTask>;
    updateTask(input: UpdateTaskInput): Promise<SokosumiTask>;
    commentOnTask(input: CommentOnTaskInput): Promise<SokosumiTask>;
    getTask(taskId: string): Promise<SokosumiTask | undefined>;
    getUser?(userId: string, options?: {
        organizationId?: string;
        organizationSlug?: string;
    }): Promise<unknown>;
    createCoworkerUsage?(input: CreateCoworkerUsageInput): Promise<unknown>;
};
export type MockSokosumiClient = SokosumiClient;
export type { Awaitable, JsonObject, JsonPrimitive, JsonValue, SokosumiLogger } from "../sharedTypes.js";
