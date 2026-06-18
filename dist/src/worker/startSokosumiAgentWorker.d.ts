export declare function startSokosumiAgentWorker({ enabled, apiUrl, apiKey, intervalMs, limit, maxPages, logger, runningComment, canceledComment, bootstrapComment, inputRequiredTimeoutMs, createTaskHandler, createTrace, resolveTaskContext, createStaleInputRequiredEvent, beforeTaskEventCreated, afterTaskEventCreated, client: providedClient }?: {
    intervalMs?: number;
    limit?: number;
    maxPages?: number;
    logger?: Console;
    runningComment?: string;
    canceledComment?: string;
}): {
    client: any;
    poller: {
        start(): void;
        stop(): void;
        tick(): Promise<void>;
    };
};
export declare function createRunningTaskEvent(comment: any): {
    comment?: string;
    status: "DRAFT" | "READY" | "INPUT_REQUIRED" | "AUTHENTICATION_REQUIRED" | "OUT_OF_CREDITS" | "CREDITS_TOPPED_UP" | "RUNNING" | "AWAITING_EXTERNAL" | "COMPLETED" | "FAILED" | "CANCEL_REQUESTED" | "CANCELED";
    origin: string;
};
export declare function createSokosumiTaskCompletionHandler({ client, logger, createTrace, resolveTaskContext, createTaskHandler }?: {
    logger?: Console;
}): (input?: {}) => Promise<any>;
export declare function getSokosumiEventText(event: any): string;
export declare function getSokosumiTaskPrimaryText(task: any): string;
