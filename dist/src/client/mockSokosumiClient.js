export function createMockSokosumiClient() {
    const tasks = new Map();
    return {
        async createTask(input) {
            const now = new Date().toISOString();
            const task = {
                id: createId("tsk"),
                title: input.title,
                description: input.description,
                status: input.status || "draft",
                comments: [],
                metadata: input.metadata || {},
                createdAt: now,
                updatedAt: now
            };
            tasks.set(task.id, task);
            return task;
        },
        async updateTask(input) {
            const task = tasks.get(input.taskId);
            if (!task) {
                throw new Error(`Sokosumi task not found: ${input.taskId}`);
            }
            const updated = {
                ...task,
                title: input.title ?? task.title,
                description: input.description ?? task.description,
                status: input.status ?? task.status,
                metadata: {
                    ...task.metadata,
                    ...(input.metadata || {})
                },
                updatedAt: new Date().toISOString()
            };
            tasks.set(updated.id, updated);
            return updated;
        },
        async commentOnTask(input) {
            const task = tasks.get(input.taskId);
            if (!task) {
                throw new Error(`Sokosumi task not found: ${input.taskId}`);
            }
            const updated = {
                ...task,
                comments: [
                    ...task.comments,
                    {
                        id: createId("cmt"),
                        body: input.body,
                        createdAt: new Date().toISOString()
                    }
                ],
                updatedAt: new Date().toISOString()
            };
            tasks.set(updated.id, updated);
            return updated;
        },
        async getTask(taskId) {
            return tasks.get(taskId);
        }
    };
}
function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
//# sourceMappingURL=mockSokosumiClient.js.map