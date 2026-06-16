import { Type } from "@earendil-works/pi-ai";
import { SOKOSUMI_TASK_EVENT_STATUSES } from "../client/types.js";
import type { PiExtensionAPI, PiToolResult } from "../piTypes.js";

type SokosumiHttpClient = {
  getCurrentCoworker(): Promise<unknown>;
  listCoworkerEvents(input?: { limit?: number; cursor?: string }): Promise<unknown>;
  getTask(taskId: string): Promise<unknown>;
  createTaskEvent(taskId: string, body: Record<string, unknown>): Promise<unknown>;
  createCoworkerUsage(input: {
    userId: string;
    organizationId?: string | null;
    idempotencyKey: string;
    credits: number;
    referenceId?: string;
  }): Promise<unknown>;
};

export function registerSokosumiCoworkerTools(pi: PiExtensionAPI, client: SokosumiHttpClient) {
  pi.registerTool({
    name: "sokosumi_get_current_coworker",
    label: "Get Current Sokosumi Coworker",
    description: "Get the authenticated Sokosumi coworker profile for this agent.",
    parameters: Type.Object({}),
    async execute() {
      return toolResult(await client.getCurrentCoworker());
    }
  });

  pi.registerTool({
    name: "sokosumi_list_coworker_events",
    label: "List Sokosumi Coworker Events",
    description: "List task events assigned to the authenticated Sokosumi coworker.",
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, description: "Maximum number of events to return" })),
      cursor: Type.Optional(Type.String({ description: "Pagination cursor" }))
    }),
    async execute(_toolCallId, params) {
      return toolResult(await client.listCoworkerEvents(params));
    }
  });

  pi.registerTool({
    name: "sokosumi_get_task",
    label: "Get Sokosumi Task",
    description: "Get a Sokosumi task by id using the authenticated coworker API key.",
    parameters: Type.Object({
      taskId: Type.String({ description: "Sokosumi task id" })
    }),
    async execute(_toolCallId, params) {
      return toolResult(await client.getTask(params.taskId));
    }
  });

  pi.registerTool({
    name: "sokosumi_create_task_event",
    label: "Create Sokosumi Task Event",
    description: "Post a task-board event for a Sokosumi task.",
    parameters: Type.Object({
      taskId: Type.String({ description: "Sokosumi task id" }),
      status: Type.Union(SOKOSUMI_TASK_EVENT_STATUSES.map((status) => Type.Literal(status))),
      comment: Type.Optional(Type.String({ description: "Visible task-board comment" })),
      origin: Type.Optional(
        Type.Union([
          Type.Literal("SLACK"),
          Type.Literal("TEAMS"),
          Type.Literal("EMAIL"),
          Type.Literal("LINEAR"),
          Type.Literal("GITHUB"),
          Type.Literal("WHATSAPP"),
          Type.Literal("TELEGRAM"),
          Type.Literal("SIGNAL"),
          Type.Literal("DISCORD"),
          Type.Literal("CHAT"),
          Type.Literal("MESSENGER"),
          Type.Literal("SOKOSUMI"),
          Type.Literal("UNKNOWN")
        ])
      ),
      credits: Type.Optional(Type.Number({ exclusiveMinimum: 0, description: "Credits to charge, if applicable" }))
    }),
    async execute(_toolCallId, params) {
      const { taskId, ...body } = params;
      return toolResult(
        await client.createTaskEvent(taskId, {
          origin: "SOKOSUMI",
          ...body
        })
      );
    }
  });

  pi.registerTool({
    name: "sokosumi_create_coworker_usage",
    label: "Create Sokosumi Coworker Usage",
    description: "Record credit usage for the authenticated Sokosumi coworker.",
    parameters: Type.Object({
      userId: Type.String({ description: "Sokosumi user id to charge" }),
      organizationId: Type.Optional(Type.String({ description: "Sokosumi organization id, when charging organization credits" })),
      idempotencyKey: Type.String({ description: "Stable idempotency key for this usage record" }),
      credits: Type.Number({ exclusiveMinimum: 0, description: "Credits to charge" }),
      referenceId: Type.Optional(Type.String({ description: "Optional task, event, or job id for audit linkage" }))
    }),
    async execute(_toolCallId, params) {
      return toolResult(
        await client.createCoworkerUsage({
          userId: params.userId,
          organizationId: params.organizationId || null,
          idempotencyKey: params.idempotencyKey,
          credits: params.credits,
          referenceId: params.referenceId
        })
      );
    }
  });
}

function toolResult(details: unknown): PiToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(details, null, 2)
      }
    ],
    details
  };
}
