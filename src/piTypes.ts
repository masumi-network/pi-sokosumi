import type { Awaitable } from "./sharedTypes.js";

export type PiToolContent = {
  type: "text";
  text: string;
};

export type PiToolResult<TDetails = unknown> = {
  content: PiToolContent[];
  details?: TDetails;
};

export type PiToolDefinition<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  TDetails = unknown
> = {
  name: string;
  label?: string;
  description?: string;
  parameters: unknown;
  execute(toolCallId: string, params: TParams): Awaitable<PiToolResult<TDetails>>;
};

export type PiNotificationLevel = "info" | "warning" | "error";

export type PiExtensionEventContext = Record<string, unknown> & {
  ui: {
    notify(message: string, level: PiNotificationLevel): void;
  };
};

export type PiExtensionEventHandler<
  TEvent = unknown,
  TContext extends PiExtensionEventContext = PiExtensionEventContext
> = (event: TEvent, context: TContext) => unknown;

export type PiToolRegistrationAPI = {
  registerTool<TParams extends Record<string, unknown>, TDetails>(
    tool: PiToolDefinition<TParams, TDetails>
  ): void;
};

export type PiExtensionAPI = PiToolRegistrationAPI & {
  on<TEvent = unknown, TContext extends PiExtensionEventContext = PiExtensionEventContext>(
    eventName: string,
    handler: PiExtensionEventHandler<TEvent, TContext>
  ): void;
};
