import type { SokosumiMasumiPaymentPayload } from "../masumi/sokosumiMasumiPaymentPayload.js";
export type SokosumiTaskStatus = "draft" | "in_progress" | "awaiting_approval" | "done" | "failed";
export declare const SOKOSUMI_EVENT_CHANNELS: readonly ["SLACK", "TEAMS", "EMAIL", "LINEAR", "GITHUB", "WHATSAPP", "TELEGRAM", "SIGNAL", "DISCORD", "CHAT", "MESSENGER", "SOKOSUMI", "UNKNOWN"];
export type SokosumiEventChannel = typeof SOKOSUMI_EVENT_CHANNELS[number];
/** @deprecated Sokosumi calls this field `channel`; use SOKOSUMI_EVENT_CHANNELS. */
export declare const SOKOSUMI_EVENT_ORIGINS: readonly ["SLACK", "TEAMS", "EMAIL", "LINEAR", "GITHUB", "WHATSAPP", "TELEGRAM", "SIGNAL", "DISCORD", "CHAT", "MESSENGER", "SOKOSUMI", "UNKNOWN"];
/** @deprecated Sokosumi calls this field `channel`; use SokosumiEventChannel. */
export type SokosumiEventOrigin = SokosumiEventChannel;
export declare const SOKOSUMI_TASK_EVENT_STATUSES: readonly ["DRAFT", "QUEUED", "READY", "GRANT_PENDING", "INPUT_REQUIRED", "APPROVAL_REQUIRED", "AUTHENTICATION_REQUIRED", "OUT_OF_CREDITS", "CREDITS_TOPPED_UP", "RUNNING", "AWAITING_EXTERNAL", "COMPLETED", "FAILED", "CANCELED"];
export type SokosumiTaskEventStatus = typeof SOKOSUMI_TASK_EVENT_STATUSES[number];
export type SokosumiNonAuthenticationTaskEventStatus = Exclude<SokosumiTaskEventStatus, "AUTHENTICATION_REQUIRED">;
export declare const SOKOSUMI_TASK_EVENT_STATUS: { readonly [Status in SokosumiTaskEventStatus]: Status; };
export declare const SOKOSUMI_COWORKER_PROGRESS_STATUSES: readonly ["DRAFT", "QUEUED", "READY", "GRANT_PENDING", "INPUT_REQUIRED", "APPROVAL_REQUIRED", "AUTHENTICATION_REQUIRED", "OUT_OF_CREDITS", "CREDITS_TOPPED_UP", "RUNNING", "AWAITING_EXTERNAL", "COMPLETED", "FAILED", "CANCELED", "CANCEL_REQUESTED", "CANCELLED", "DONE"];
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
export type SokosumiUserSummary = Record<string, unknown> & {
    id: string;
    name: string;
    image?: string | null;
};
export type SokosumiCoworkerSummary = Record<string, unknown> & {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
};
export type SokosumiOrchestratorSummary = Record<string, unknown> & {
    id: string;
};
export type SokosumiTaskEventActor = {
    type: "user";
    id: string;
    user: SokosumiUserSummary;
} | {
    type: "coworker";
    id: string;
    coworker: SokosumiCoworkerSummary;
} | {
    type: "orchestrator";
    id: string;
    orchestrator: SokosumiOrchestratorSummary;
};
export type SokosumiTaskEvent<TMetadata extends Record<string, unknown> = Record<string, unknown>> = Record<string, unknown> & {
    id: string;
    taskId: string;
    createdAt: string;
    updatedAt: string;
    actor: SokosumiTaskEventActor | null;
    channel: SokosumiEventChannel;
    /** @deprecated Use channel. */
    origin: SokosumiEventOrigin;
    status?: SokosumiCoworkerProgressStatus | null;
    transactionId?: string | null;
    credits?: number | null;
    comment?: string | null;
    authenticationUrl?: string | null;
    message?: string;
    body?: string;
    content?: string;
    description?: string;
    title?: string;
    name?: string;
    coworkerId?: string | null;
    coworker_id?: string | null;
    coworker?: SokosumiCoworkerSummary | null;
    userId?: string | null;
    user?: SokosumiUserSummary | null;
    orchestratorId?: string | null;
    orchestrator?: SokosumiOrchestratorSummary | null;
    attachments?: unknown[];
    media?: unknown[];
    files?: unknown[];
    metadata?: TMetadata;
    created_at?: string;
    updated_at?: string;
    timestamp?: string | number;
};
type SokosumiTaskEventChannelInput = {
    channel?: SokosumiEventChannel;
    origin?: never;
} | {
    channel?: never;
    origin?: SokosumiEventOrigin;
};
type SokosumiTaskEventAuthenticationInput = {
    status: "AUTHENTICATION_REQUIRED";
    authenticationUrl: string;
} | {
    status?: Exclude<SokosumiTaskEventStatus, "AUTHENTICATION_REQUIRED">;
    authenticationUrl?: never;
};
type SokosumiTaskEventContentInput<TPayment extends SokosumiMasumiPaymentPayload> = {
    status: SokosumiTaskEventStatus;
    comment?: string;
    credits?: number;
    masumiPayment?: never;
} | {
    status: SokosumiTaskEventStatus;
    comment?: string;
    credits?: never;
    masumiPayment: TPayment;
} | {
    status?: never;
    comment: string;
    credits?: number;
    masumiPayment?: never;
} | {
    status?: never;
    comment?: string;
    credits: number;
    masumiPayment?: never;
} | {
    status?: never;
    comment?: string;
    credits?: never;
    masumiPayment: TPayment;
};
export type SokosumiTaskEventInput<TMetadata extends Record<string, unknown> = Record<string, unknown>, TPayment extends SokosumiMasumiPaymentPayload = SokosumiMasumiPaymentPayload> = {
    metadata?: TMetadata;
} & SokosumiTaskEventChannelInput & SokosumiTaskEventAuthenticationInput & SokosumiTaskEventContentInput<TPayment>;
export type SokosumiTaskCreator = SokosumiTaskEventActor;
export declare const SOKOSUMI_TASK_LINK_RELATIONS: readonly ["related", "blocks", "blocked_by", "parent", "child", "duplicate", "schedule_run", "schedule_series"];
export type SokosumiTaskLinkRelation = typeof SOKOSUMI_TASK_LINK_RELATIONS[number];
export type SokosumiTaskLink = Record<string, unknown> & {
    id: string;
    createdAt: string;
    updatedAt: string;
    relation: SokosumiTaskLinkRelation;
    peerTask: {
        id: string;
        name: string;
        status: SokosumiObservedTaskStatus;
        archivedAt: string | null;
    };
    note: string | null;
};
export type SokosumiTaskSnapshot<TEvent extends SokosumiTaskEvent = SokosumiTaskEvent, TMetadata = string> = Record<string, unknown> & {
    id: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    owner: SokosumiUserSummary;
    userId: string;
    user: SokosumiUserSummary;
    organizationId: string | null;
    organization: Record<string, unknown> | null;
    projectId: string | null;
    assigneeId: string | null;
    assignee: SokosumiCoworkerSummary | null;
    coworkerId: string | null;
    coworker: SokosumiCoworkerSummary | null;
    creator: SokosumiTaskCreator;
    orchestratorId: string | null;
    orchestrator: SokosumiOrchestratorSummary | null;
    name: string;
    title?: string;
    description: string | null;
    body?: string;
    content?: string;
    status: SokosumiObservedTaskStatus;
    grantResumeStatus: "DRAFT" | "READY" | null;
    pendingVendorGrantId: string | null;
    metadata: TMetadata | null;
    nextRunAt: string | null;
    credits: number;
    events: TEvent[];
    jobs: Record<string, unknown>[];
    workspace: Record<string, unknown>;
    share: Record<string, unknown> | null;
    links: SokosumiTaskLink[];
    files: Record<string, unknown>[];
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
    id: string;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
    isWhitelisted: boolean;
    priority: number;
    slug: string;
    name: string;
    caption?: string | null;
    vendor: Record<string, unknown>;
    url?: string | null;
    baseURL: string | null;
    description?: string | null;
    capabilities: string[];
    image?: string | null;
    metadata: Record<string, unknown> | null;
};
export type SokosumiUser = Record<string, unknown> & {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    role: string;
    organizationId?: string | null;
};
export type SokosumiCoworkerUsage = Record<string, unknown> & {
    id: string;
    createdAt: string;
    updatedAt: string;
    idempotencyKey: string;
    referenceId: string | null;
    coworkerId: string;
    userId: string;
    organizationId: string | null;
    credits: number;
    transactionId: string;
};
export type SokosumiClient = {
    createTask(input: CreateTaskInput): Promise<SokosumiTask>;
    updateTask(input: UpdateTaskInput): Promise<SokosumiTask>;
    commentOnTask(input: CommentOnTaskInput): Promise<SokosumiTask>;
    getTask(taskId: string): Promise<SokosumiTask | undefined>;
    getUser?(userId: string, options?: SokosumiDelegationOptions): Promise<SokosumiUser | undefined>;
    createCoworkerUsage?(input: CreateCoworkerUsageInput): Promise<SokosumiCoworkerUsage>;
};
export type MockSokosumiClient = SokosumiClient;
export type { Awaitable, JsonObject, JsonPrimitive, JsonValue, SokosumiLogger } from "../sharedTypes.js";
