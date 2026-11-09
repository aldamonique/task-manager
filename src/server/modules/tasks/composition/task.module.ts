import { TaskService } from "../application/task.service";
import { InMemoryTaskRepository } from "../infrastructure/in-memory-task.repository";
import { InMemoryTaskActivityRepository } from "../infrastructure/in-memory-task-activity.repository";

const globalForTasks = globalThis as typeof globalThis & {
  taskService?: TaskService;
};

export function getTaskService(): TaskService {
  // Reuse one instance so in-memory data survives requests and dev reloads.
  if (!globalForTasks.taskService) {
    const taskRepository = new InMemoryTaskRepository();
    const activityRepository = new InMemoryTaskActivityRepository();
    globalForTasks.taskService = new TaskService(
      taskRepository,
      activityRepository,
    );
  }

  return globalForTasks.taskService;
}
