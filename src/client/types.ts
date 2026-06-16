export type SokosumiTaskStatus = "draft" | "in_progress" | "awaiting_approval" | "done" | "failed";

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
  return SOKOSUMI_TASK_EVENT_STATUSES.includes(normalizeSokosumiTaskStatus(status) as SokosumiTaskEventStatus);
}

export function isSokosumiCoworkerProgressStatus(status: unknown): status is SokosumiCoworkerProgressStatus {
  return SOKOSUMI_COWORKER_PROGRESS_STATUSES.includes(
    normalizeSokosumiTaskStatus(status) as SokosumiCoworkerProgressStatus
  );
}

export function isSokosumiTerminalTaskEventStatus(status: unknown): status is SokosumiTerminalTaskEventStatus {
  return SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES.includes(
    normalizeSokosumiTaskStatus(status) as SokosumiTerminalTaskEventStatus
  );
}

export function isSokosumiCanceledTaskEventStatus(status: unknown): status is SokosumiCanceledTaskEventStatus {
  return SOKOSUMI_CANCELED_TASK_EVENT_STATUSES.includes(
    normalizeSokosumiTaskStatus(status) as SokosumiCanceledTaskEventStatus
  );
}

export function isSokosumiTaskEventDecisionStatus(status: unknown): status is SokosumiTaskEventDecisionStatus {
  return SOKOSUMI_TASK_EVENT_DECISION_STATUSES.includes(
    normalizeSokosumiTaskStatus(status) as SokosumiTaskEventDecisionStatus
  );
}

export function normalizeSokosumiTaskStatus(status: unknown) {
  return String(status || "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

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

export type SokosumiTaskComment = {
  id: string;
  body: string;
  createdAt: string;
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

export type SokosumiClient = {
  createTask(input: CreateTaskInput): Promise<SokosumiTask>;
  updateTask(input: UpdateTaskInput): Promise<SokosumiTask>;
  commentOnTask(input: CommentOnTaskInput): Promise<SokosumiTask>;
  getTask(taskId: string): Promise<SokosumiTask | undefined>;
  getUser?(userId: string, options?: { organizationId?: string; organizationSlug?: string }): Promise<unknown>;
  createCoworkerUsage?(input: CreateCoworkerUsageInput): Promise<unknown>;
};
