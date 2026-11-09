import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";

import {
  DEFAULT_PAGE_SIZE,
  InvalidCursorError,
  type CursorPage,
} from "../domain/cursor-page";
import type { Task } from "../domain/task.entity";
import type { TaskStatus } from "../domain/task-status";
import type { TaskSummary } from "../domain/task-summary";
import type { TaskRepository } from "../domain/task.repository";
import type { TaskActivity, TaskActivityType } from "../domain/task-activity";
import type { TaskActivityRepository } from "../domain/task-activity.repository";
import {
  normalizeTaskDescription,
  normalizeTaskTitle,
} from "../domain/task.rules";

type CreateTaskInput = Pick<Task, "title"> & {
    description?: string;
};

type UpdateTaskInput = Partial<Pick<Task, "title" | "description">>;

interface ListTaskPageInput {
  limit?: number;
  cursor?: string;
  status?: TaskStatus;
}

interface ListActivityPageInput {
  limit?: number;
  cursor?: string;
}

interface TaskCursor {
  createdAt: number;
  id: string;
}

interface TaskServiceDependencies {
  generateId: () => string;
  generateActivityId: () => string;
  now: () => number;
}

const defaultDependencies: TaskServiceDependencies = {
  generateId: randomUUID,
  generateActivityId: randomUUID,
  now: Date.now,
};

// IDs provide a stable order when multiple tasks share the same timestamp.
function compareTaskIds(firstId: string, secondId: string): number {
  if (firstId === secondId) {
    return 0;
  }

  return firstId < secondId ? -1 : 1;
}

// The cursor remains opaque to clients while carrying the pagination key.
function encodeTaskCursor(task: Task): string {
  const cursor: TaskCursor = {
    createdAt: task.createdAt,
    id: task.id,
  };

  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeTaskCursor(cursor: string): TaskCursor {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("createdAt" in parsed) ||
      !("id" in parsed) ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt) ||
      typeof parsed.id !== "string" ||
      parsed.id.length === 0
    ) {
      throw new InvalidCursorError();
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw error;
    }

    throw new InvalidCursorError();
  }
}

function comesAfterTaskCursor(task: Task, cursor: TaskCursor): boolean {
  // Tasks are sorted by newest timestamp, then by ascending ID.
  if (task.createdAt !== cursor.createdAt) {
    return task.createdAt < cursor.createdAt;
  }

  return compareTaskIds(task.id, cursor.id) > 0;
}

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly activityRepository: TaskActivityRepository,
    dependencies: Partial<TaskServiceDependencies> = {},
  ) {
    this.dependencies = {
      ...defaultDependencies,
      ...dependencies,
    };
  }

  private readonly dependencies: TaskServiceDependencies;

  listTasks(status?: TaskStatus): Task[] {
    const tasks = this.taskRepository.findAll();
    const filteredTasks = status
      ? tasks.filter((task) => task.status === status)
      : tasks;

    return filteredTasks.sort(
      (first, second) =>
        second.createdAt - first.createdAt ||
        compareTaskIds(first.id, second.id),
    );
  }

  listTaskPage({
    limit = DEFAULT_PAGE_SIZE,
    cursor,
    status,
  }: ListTaskPageInput = {}): CursorPage<Task> {
    const tasks = this.listTasks(status);
    const decodedCursor = cursor ? decodeTaskCursor(cursor) : undefined;
    const pageCandidates = decodedCursor
      ? tasks.filter((task) => comesAfterTaskCursor(task, decodedCursor))
      : tasks;
    const items = pageCandidates.slice(0, limit);

    return {
      items,
      nextCursor:
        pageCandidates.length > items.length && items.length > 0
          ? encodeTaskCursor(items[items.length - 1])
          : null,
      total: tasks.length,
    };
  }

  getTaskById(id: string): Task | undefined {
    return this.taskRepository.findById(id);
  }

  createTask(input: CreateTaskInput): Task {
    const occurredAt = this.dependencies.now();
    const task: Task = {
      id: this.dependencies.generateId(),
      title: normalizeTaskTitle(input.title),
      description: normalizeTaskDescription(input.description),
      status: "pending",
      createdAt: occurredAt,
    };

    const savedTask = this.taskRepository.save(task);
    this.recordActivity(savedTask, "created", "Task added", occurredAt);

    return savedTask;
  }

  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const existingTask = this.taskRepository.findById(id);

    if (!existingTask) {
      return undefined;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...(input.title !== undefined && {
        title: normalizeTaskTitle(input.title),
      }),
      ...(input.description !== undefined && {
        description: normalizeTaskDescription(input.description),
      }),
    };

    if (
      updatedTask.title === existingTask.title &&
      updatedTask.description === existingTask.description
    ) {
      // Normalized no-op updates should not create duplicate activity entries.
      return existingTask;
    }

    const savedTask = this.taskRepository.save(updatedTask);
    this.recordActivity(savedTask, "updated", "Task details updated");

    return savedTask;
  }

  deleteTask(id: string): boolean {
    const existingTask = this.taskRepository.findById(id);

    if (!existingTask || !this.taskRepository.delete(id)) {
      return false;
    }

    this.recordActivity(existingTask, "deleted", "Task removed");
    return true;
  }

  updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
    const existingTask = this.taskRepository.findById(id);

    if (!existingTask) {
      return undefined;
    }

    if (existingTask.status === status) {
      return existingTask;
    }

    const savedTask = this.taskRepository.save({
      ...existingTask,
      status,
    });

    const statusLabel = status.replace("-", " ");
    this.recordActivity(
      savedTask,
      "status-changed",
      `Status changed to ${statusLabel}`,
    );

    return savedTask;
  }

  listRecentActivities(limit = 5): TaskActivity[] {
    return this.activityRepository.findRecent(limit);
  }

  listActivityPage({
    limit = DEFAULT_PAGE_SIZE,
    cursor,
  }: ListActivityPageInput = {}): CursorPage<TaskActivity> {
    return this.activityRepository.findPage(limit, cursor);
  }

  getTaskSummary(): TaskSummary {
    const tasks = this.taskRepository.findAll();
    const summary: TaskSummary = {
      total: tasks.length,
      byStatus: {
        pending: 0,
        "in-progress": 0,
        completed: 0,
      },
    };

    for (const task of tasks) {
      summary.byStatus[task.status] += 1;
    }

    return summary;
  }

  private recordActivity(
    task: Task,
    type: TaskActivityType,
    description: string,
    occurredAt = this.dependencies.now(),
  ): void {
    // Store a snapshot so later edits or deletion do not rewrite the history.
    this.activityRepository.append({
      id: this.dependencies.generateActivityId(),
      taskId: task.id,
      taskTitle: task.title,
      type,
      description,
      occurredAt,
    });
  }
}
