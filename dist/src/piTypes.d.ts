export type PiToolContent = {
    type: "text";
    text: string;
};
export type PiToolResult = {
    content: PiToolContent[];
    details?: unknown;
};
export type PiToolDefinition = {
    name: string;
    label?: string;
    description?: string;
    parameters: unknown;
    execute(toolCallId: string, params: any): Promise<PiToolResult> | PiToolResult;
};
export type PiExtensionAPI = {
    registerTool(tool: PiToolDefinition): void;
    on?(eventName: string, handler: (event: unknown, context: any) => unknown): void;
};
