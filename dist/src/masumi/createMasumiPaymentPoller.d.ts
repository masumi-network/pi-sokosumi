export declare function createMasumiPaymentPoller({ enabled, client, store, intervalMs, limit, logger }?: {
    enabled?: boolean;
    intervalMs?: number;
    limit?: number;
    logger?: Console;
}): {
    start(): void;
    stop(): void;
    tick(): Promise<void>;
};
export declare function isReadyForSubmitResult(payment?: {}): boolean;
