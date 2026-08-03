export type SokosumiTaskStatus = "draft" | "in_progress" | "awaiting_approval" | "done" | "failed";

export const SOKOSUMI_EVENT_ORIGINS = [
  "USER",
  "SLACK",
  "TEAMS",
  "EMAIL",
  "LINEAR",
  "GITHUB",
  "WHATSAPP",
  "TELEGRAM",
  "SIGNAL",
  "DISCORD",
  "CHAT",
  "MESSENGER",
  "SOKOSUMI",
  "UNKNOWN"
] as const;

export type SokosumiEventOrigin = typeof SOKOSUMI_EVENT_ORIGINS[number];

export const SOKOSUMI_TASK_EVENT_STATUSES = [
  "DRAFT",
  "READY",
  "INPUT_REQUIRED",
  "AUTHENTICATION_REQUIRED",
  "OUT_OF_CREDITS",
  "CREDITS_TOPPED_UP",
  "RUNNING",
  "AWAITING_EXTERNAL",
  "COMPLETED",
  "FAILED",
  "CANCEL_REQUESTED",
  "CANCELED"
] as const;

export type SokosumiTaskEventStatus = typeof SOKOSUMI_TASK_EVENT_STATUSES[number];

export const SOKOSUMI_TASK_EVENT_STATUS = Object.freeze(
  Object.fromEntries(SOKOSUMI_TASK_EVENT_STATUSES.map((status) => [status, status]))
) as Record<SokosumiTaskEventStatus, SokosumiTaskEventStatus>;

export const SOKOSUMI_COWORKER_PROGRESS_STATUSES = [
  "RUNNING",
  "AWAITING_EXTERNAL",
  "INPUT_REQUIRED",
  "AUTHENTICATION_REQUIRED",
  "OUT_OF_CREDITS",
  "COMPLETED",
  "FAILED",
  "CANCEL_REQUESTED",
  "CANCELED",
  "CANCELLED",
  "DONE"
] as const;

export type SokosumiCoworkerProgressStatus = typeof SOKOSUMI_COWORKER_PROGRESS_STATUSES[number];

export const SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES = [
  "COMPLETED",
  "FAILED",
  "CANCEL_REQUESTED",
  "CANCELED",
  "CANCELLED",
  "DONE"
] as const;

export type SokosumiTerminalTaskEventStatus = typeof SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES[number];

export const SOKOSUMI_CANCELED_TASK_EVENT_STATUSES = [
  "CANCELED",
  "CANCELLED"
] as const;

export type SokosumiCanceledTaskEventStatus = typeof SOKOSUMI_CANCELED_TASK_EVENT_STATUSES[number];

export const SOKOSUMI_TASK_EVENT_DECISION_STATUSES = [
  "COMPLETED",
  "INPUT_REQUIRED",
  "FAILED"
] as const;

export type SokosumiTaskEventDecisionStatus = typeof SOKOSUMI_TASK_EVENT_DECISION_STATUSES[number];

export type SokosumiObservedTaskStatus =
  | SokosumiTaskStatus
  | SokosumiTaskEventStatus
  | Exclude<SokosumiCoworkerProgressStatus, SokosumiTaskEventStatus>;

export const SOKOSUMI_TASK_EVENT_STATUS_DECISION_PROMPT = [
  "Choose the Sokosumi task event status for your task-board reply.",
  "",
  "Use exactly one of these statuses:",
  "- COMPLETED: the user's requested work is finished. Use this when you answered the task fully or a required write/external tool succeeded.",
  "- INPUT_REQUIRED: you need more user input, approval, setup, credentials, account selection, final copy, date/time/timezone, media choice, or clarification before the task can finish.",
  "- FAILED: you could not process the task because of a runtime, provider, or tool failure.",
  "",
  "Never use COMPLETED when your reply asks the user to do something before the task can finish."
].join("\n");

export function isSokosumiTaskEventStatus(status: unknown): status is SokosumiTaskEventStatus {
  return SOKOSUMI_TASK_EVENT_STATUSES.some((candidate) => candidate === status);
}

export function isSokosumiCoworkerProgressStatus(status: unknown): status is SokosumiCoworkerProgressStatus {
  return SOKOSUMI_COWORKER_PROGRESS_STATUSES.some((candidate) => candidate === status);
}

export function isSokosumiTerminalTaskEventStatus(status: unknown): status is SokosumiTerminalTaskEventStatus {
  return SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES.some((candidate) => candidate === status);
}

export function isSokosumiCanceledTaskEventStatus(status: unknown): status is SokosumiCanceledTaskEventStatus {
  return SOKOSUMI_CANCELED_TASK_EVENT_STATUSES.some((candidate) => candidate === status);
}

export function isSokosumiTaskEventDecisionStatus(status: unknown): status is SokosumiTaskEventDecisionStatus {
  return SOKOSUMI_TASK_EVENT_DECISION_STATUSES.some((candidate) => candidate === status);
}

export function isSokosumiEventOrigin(origin: unknown): origin is SokosumiEventOrigin {
  return SOKOSUMI_EVENT_ORIGINS.some((candidate) => candidate === origin);
}

export function normalizeSokosumiTaskStatus(status: unknown) {
  return String(status || "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

export type SokosumiTaskComment = {
  id: string;
  body: string;
  createdAt: string;
};

export type SokosumiTaskEvent<TMetadata extends Record<string, unknown> = Record<string, unknown>> =
  Record<string, unknown> & {
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
    coworker?: { id?: string; slug?: string } | null;
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

export type SokosumiTaskEventInput<TMetadata extends Record<string, unknown> = Record<string, unknown>> =
  Record<string, unknown> & {
    status?: SokosumiTaskEventStatus;
    origin?: SokosumiEventOrigin;
    comment?: string;
    credits?: number;
    metadata?: TMetadata;
    masumiPayment?: unknown;
  };

export type SokosumiTaskSnapshot<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = Record<string, unknown> & {
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
  getUser?(userId: string, options?: { organizationId?: string; organizationSlug?: string }): Promise<unknown>;
  createCoworkerUsage?(input: CreateCoworkerUsageInput): Promise<unknown>;
};

export type MockSokosumiClient = SokosumiClient;

export type {
  Awaitable,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  SokosumiLogger
} from "../sharedTypes.js";
