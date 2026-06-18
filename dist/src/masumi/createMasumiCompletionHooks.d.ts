export declare function createMasumiCompletionHooks({ enabled, masumiClient, store, calculateCostCents, createPaymentMetadata, logger }?: {
    enabled?: boolean;
    logger?: Console;
}): {
    beforeTaskEventCreated(input?: {}): Promise<any>;
    afterTaskEventCreated(input?: {}): Promise<any>;
};
