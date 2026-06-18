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
];
export const SOKOSUMI_TASK_EVENT_STATUS = Object.freeze(Object.fromEntries(SOKOSUMI_TASK_EVENT_STATUSES.map((status) => [status, status])));
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
];
export const SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES = [
    "COMPLETED",
    "FAILED",
    "CANCEL_REQUESTED",
    "CANCELED",
    "CANCELLED",
    "DONE"
];
export const SOKOSUMI_CANCELED_TASK_EVENT_STATUSES = [
    "CANCELED",
    "CANCELLED"
];
export const SOKOSUMI_TASK_EVENT_DECISION_STATUSES = [
    "COMPLETED",
    "INPUT_REQUIRED",
    "FAILED"
];
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
export function isSokosumiTaskEventStatus(status) {
    return SOKOSUMI_TASK_EVENT_STATUSES.includes(normalizeSokosumiTaskStatus(status));
}
export function isSokosumiCoworkerProgressStatus(status) {
    return SOKOSUMI_COWORKER_PROGRESS_STATUSES.includes(normalizeSokosumiTaskStatus(status));
}
export function isSokosumiTerminalTaskEventStatus(status) {
    return SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES.includes(normalizeSokosumiTaskStatus(status));
}
export function isSokosumiCanceledTaskEventStatus(status) {
    return SOKOSUMI_CANCELED_TASK_EVENT_STATUSES.includes(normalizeSokosumiTaskStatus(status));
}
export function isSokosumiTaskEventDecisionStatus(status) {
    return SOKOSUMI_TASK_EVENT_DECISION_STATUSES.includes(normalizeSokosumiTaskStatus(status));
}
export function normalizeSokosumiTaskStatus(status) {
    return String(status || "")
        .trim()
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toUpperCase();
}
//# sourceMappingURL=types.js.map