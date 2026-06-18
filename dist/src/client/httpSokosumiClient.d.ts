export declare function createHttpSokosumiClient({ apiUrl, apiKey, fetchImpl, timeoutMs }: {
    apiUrl: any;
    apiKey: any;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}): {
    getCurrentCoworker(): Promise<any>;
    listCoworkerEvents({ limit, cursor }?: {
        limit?: number;
    }): Promise<{
        events: any;
        pagination: any;
    }>;
    getTask(taskId: any): Promise<any>;
    updateTask(input?: {}): Promise<any>;
    getUser(userId: any, options?: {}): Promise<any>;
    createTaskEvent(taskId: any, body: any): Promise<any>;
    createCoworkerUsage(input: any): Promise<any>;
};
