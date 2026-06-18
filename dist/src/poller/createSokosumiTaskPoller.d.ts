export declare function createSokosumiTaskPoller({ client, intervalMs, limit, maxPages, logger, shouldProcessEvent, hasTaskProgress, createReopenedEvent, createRunningEvent, createCanceledEvent, createCompletedEvent, createFailedEvent, createStaleInputRequiredEvent, inputRequiredTimeoutMs, now, beforeTaskEventCreated, afterTaskEventCreated }: {
    client: any;
    intervalMs?: number;
    limit?: number;
    maxPages?: number;
    logger?: Console;
    shouldProcessEvent?: typeof defaultShouldProcessEvent;
    hasTaskProgress?: typeof defaultHasTaskProgress;
    createReopenedEvent?: typeof defaultCreateReopenedEvent;
    createRunningEvent?: typeof defaultCreateRunningEvent;
    createCanceledEvent?: typeof defaultCreateCanceledEvent;
    createCompletedEvent: any;
    createFailedEvent?: typeof defaultCreateFailedEvent;
    createStaleInputRequiredEvent: any;
    inputRequiredTimeoutMs?: number;
    now?: () => Date;
    beforeTaskEventCreated: any;
    afterTaskEventCreated: any;
}): {
    start(): void;
    stop(): void;
    tick(): Promise<void>;
};
declare function defaultShouldProcessEvent(event: any, task: any): boolean;
declare function defaultHasTaskProgress(task: any, triggerEvent: any): any;
declare function defaultCreateRunningEvent(): {
    status: "DRAFT" | "READY" | "INPUT_REQUIRED" | "AUTHENTICATION_REQUIRED" | "OUT_OF_CREDITS" | "CREDITS_TOPPED_UP" | "RUNNING" | "AWAITING_EXTERNAL" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELED";
    origin: string;
    comment: string;
};
declare function defaultCreateReopenedEvent(): {
    status: "DRAFT" | "READY" | "INPUT_REQUIRED" | "AUTHENTICATION_REQUIRED" | "OUT_OF_CREDITS" | "CREDITS_TOPPED_UP" | "RUNNING" | "AWAITING_EXTERNAL" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELED";
    origin: string;
    comment: string;
};
declare function defaultCreateFailedEvent({ error }: {
    error: any;
}): {
    status: "DRAFT" | "READY" | "INPUT_REQUIRED" | "AUTHENTICATION_REQUIRED" | "OUT_OF_CREDITS" | "CREDITS_TOPPED_UP" | "RUNNING" | "AWAITING_EXTERNAL" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELED";
    origin: string;
    comment: string;
};
declare function defaultCreateCanceledEvent(): {
    status: "DRAFT" | "READY" | "INPUT_REQUIRED" | "AUTHENTICATION_REQUIRED" | "OUT_OF_CREDITS" | "CREDITS_TOPPED_UP" | "RUNNING" | "AWAITING_EXTERNAL" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELED";
    origin: string;
    comment: string;
};
export {};
