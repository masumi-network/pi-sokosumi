import type {
  CommentOnTaskInput,
  CreateTaskInput,
  SokosumiClient,
  SokosumiTask,
  UpdateTaskInput
} from "./types.js";

export function createMockSokosumiClient(): SokosumiClient {
  const tasks = new Map<string, SokosumiTask>();

  return {
    async createTask(input: CreateTaskInput) {
      const now = new Date().toISOString();
      const task: SokosumiTask = {
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

    async updateTask(input: UpdateTaskInput) {
      const task = tasks.get(input.taskId);
      if (!task) {
        throw new Error(`Sokosumi task not found: ${input.taskId}`);
      }

      const updated: SokosumiTask = {
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

    async commentOnTask(input: CommentOnTaskInput) {
      const task = tasks.get(input.taskId);
      if (!task) {
        throw new Error(`Sokosumi task not found: ${input.taskId}`);
      }

      const updated: SokosumiTask = {
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

    async getTask(taskId: string) {
      return tasks.get(taskId);
    }
  };
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
