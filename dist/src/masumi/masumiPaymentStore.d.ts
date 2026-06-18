export declare function createMemoryMasumiPaymentStore(): {
    provider: string;
    status(): {
        provider: string;
        configured: boolean;
        persistent: boolean;
        pending: number;
        startedAt: string;
    };
    recordPendingMasumiPayment(input?: {}): Promise<{
        masumiPayment: any;
        completionPayload: any;
        metadata: any;
        submitResponse: any;
    }>;
    listPendingMasumiPayments({ limit }?: {
        limit?: number;
    }): Promise<{
        masumiPayment: any;
        completionPayload: any;
        metadata: any;
        submitResponse: any;
    }[]>;
    markMasumiSubmitted(input?: {}): Promise<{
        masumiPayment: any;
        completionPayload: any;
        metadata: any;
        submitResponse: any;
    }>;
    markMasumiDropped(input?: {}): Promise<{
        masumiPayment: any;
        completionPayload: any;
        metadata: any;
        submitResponse: any;
    }>;
};
export declare function normalizePendingPayment(input?: {}): {
    id: string;
    taskId: string;
    triggerEventId: string;
    taskEventId: string;
    paymentId: string;
    blockchainIdentifier: string;
    agentIdentifier: string;
    network: string;
    resultHash: string;
    submitStatus: string;
    masumiPayment: any;
    completionPayload: any;
    metadata: any;
    submitResponse: any;
    errorType: string;
    errorNote: string;
    createdAt: string;
    updatedAt: string;
    submittedAt: string;
    droppedAt: string;
};
