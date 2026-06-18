import { Type } from "@earendil-works/pi-ai";
export function registerSokosumiTools(pi, client) {
    pi.registerTool({
        name: "sokosumi_create_task",
        label: "Create Sokosumi Task",
        description: "Create a Sokosumi task in the current coworker task board. Currently uses mock in-memory storage.",
        parameters: Type.Object({
            title: Type.String({ description: "Task title" }),
            description: Type.Optional(Type.String({ description: "Task description" })),
            status: Type.Optional(Type.Union([
                Type.Literal("draft"),
                Type.Literal("in_progress"),
                Type.Literal("awaiting_approval"),
                Type.Literal("done"),
                Type.Literal("failed")
            ]))
        }),
        async execute(_toolCallId, params) {
            const task = await client.createTask(params);
            return toolResult(task);
        }
    });
    pi.registerTool({
        name: "sokosumi_update_task",
        label: "Update Sokosumi Task",
        description: "Update a Sokosumi task. Currently uses mock in-memory storage.",
        parameters: Type.Object({
            taskId: Type.String({ description: "Task id" }),
            title: Type.Optional(Type.String({ description: "Updated task title" })),
            description: Type.Optional(Type.String({ description: "Updated task description" })),
            status: Type.Optional(Type.Union([
                Type.Literal("draft"),
                Type.Literal("in_progress"),
                Type.Literal("awaiting_approval"),
                Type.Literal("done"),
                Type.Literal("failed")
            ]))
        }),
        async execute(_toolCallId, params) {
            const task = await client.updateTask(params);
            return toolResult(task);
        }
    });
    pi.registerTool({
        name: "sokosumi_comment_on_task",
        label: "Comment On Sokosumi Task",
        description: "Add a comment to a Sokosumi task. Currently uses mock in-memory storage.",
        parameters: Type.Object({
            taskId: Type.String({ description: "Task id" }),
            body: Type.String({ description: "Comment body" })
        }),
        async execute(_toolCallId, params) {
            const task = await client.commentOnTask(params);
            return toolResult(task);
        }
    });
    pi.registerTool({
        name: "sokosumi_get_task",
        label: "Get Sokosumi Task",
        description: "Get a Sokosumi task by id. Currently uses mock in-memory storage.",
        parameters: Type.Object({
            taskId: Type.String({ description: "Task id" })
        }),
        async execute(_toolCallId, params) {
            const task = await client.getTask(params.taskId);
            return toolResult(task || { error: "not_found", taskId: params.taskId });
        }
    });
}
function toolResult(details) {
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
//# sourceMappingURL=registerSokosumiTools.js.map