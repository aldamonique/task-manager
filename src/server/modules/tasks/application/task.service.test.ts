import { beforeEach, describe, expect, it } from "vitest";
import { InvalidCursorError } from "../domain/cursor-page";
import { TaskValidationError } from "../domain/task.rules";
import { InMemoryTaskActivityRepository } from "../infrastructure/in-memory-task-activity.repository";
import { InMemoryTaskRepository } from "../infrastructure/in-memory-task.repository";
import { TaskService } from "./task.service";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const thirdId = "00000000-0000-4000-8000-000000000003";

describe("TaskService", () => {
  let repository: InMemoryTaskRepository;
  let activityRepository: InMemoryTaskActivityRepository;
  let service: TaskService;
  let currentId: string;
  let currentTime: number;
  let activityIdSequence: number;

  beforeEach(() => {
    // Controlled IDs and time make ordering and activity assertions deterministic.
    repository = new InMemoryTaskRepository();
    activityRepository = new InMemoryTaskActivityRepository();
    currentId = firstId;
    currentTime = 100;
    activityIdSequence = 0;
    service = new TaskService(repository, activityRepository, {
      generateId: () => currentId,
      generateActivityId: () => `activity-${++activityIdSequence}`,
      now: () => currentTime,
    });
  });

  it("creates a normalized pending task", () => {
    const task = service.createTask({
      title: "  Review architecture  ",
      description: "  Check boundaries  ",
    });

    expect(task).toEqual({
      id: firstId,
      title: "Review architecture",
      description: "Check boundaries",
      status: "pending",
      createdAt: 100,
    });
  });

  it("enforces title rules even when called without the transport layer", () => {
    expect(() => service.createTask({ title: "   " })).toThrow(
      TaskValidationError,
    );
  });

  it("updates content and status without changing task identity", () => {
    const original = service.createTask({ title: "Original" });

    const updated = service.updateTask(original.id, {
      title: "  Updated  ",
      description: "  Description  ",
    });
    const completed = service.updateTaskStatus(original.id, "completed");

    expect(updated).toMatchObject({
      id: original.id,
      title: "Updated",
      description: "Description",
      createdAt: original.createdAt,
    });
    expect(completed?.status).toBe("completed");
  });

  it("records the complete lifecycle with exact timestamps", () => {
    const created = service.createTask({ title: "Original" });

    currentTime = 110;
    service.updateTask(created.id, { title: "Updated" });

    currentTime = 120;
    service.updateTaskStatus(created.id, "in-progress");

    currentTime = 130;
    service.deleteTask(created.id);

    expect(service.listRecentActivities(10)).toEqual([
      {
        id: "activity-4",
        taskId: firstId,
        taskTitle: "Updated",
        type: "deleted",
        description: "Task removed",
        occurredAt: 130,
      },
      {
        id: "activity-3",
        taskId: firstId,
        taskTitle: "Updated",
        type: "status-changed",
        description: "Status changed to in progress",
        occurredAt: 120,
      },
      {
        id: "activity-2",
        taskId: firstId,
        taskTitle: "Updated",
        type: "updated",
        description: "Task details updated",
        occurredAt: 110,
      },
      {
        id: "activity-1",
        taskId: firstId,
        taskTitle: "Original",
        type: "created",
        description: "Task added",
        occurredAt: 100,
      },
    ]);
    expect(service.getTaskById(created.id)).toBeUndefined();
  });

  it("does not record a duplicate status activity", () => {
    service.createTask({ title: "Already pending" });

    currentTime = 200;
    service.updateTaskStatus(firstId, "pending");

    expect(service.listRecentActivities()).toHaveLength(1);
    expect(service.listRecentActivities()[0]).toMatchObject({
      type: "created",
      occurredAt: 100,
    });
  });

  it("paginates tasks with a keyset cursor that survives deletion", () => {
    service.createTask({ title: "First" });

    currentId = secondId;
    service.createTask({ title: "Second" });

    currentId = thirdId;
    currentTime = 90;
    service.createTask({ title: "Third" });

    const firstPage = service.listTaskPage({ limit: 1 });
    expect(firstPage.items.map(({ id }) => id)).toEqual([firstId]);
    expect(firstPage.total).toBe(3);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    // A keyset cursor must remain valid even if its anchor is later removed.
    firstPage.items[0].title = "Changed outside the service";
    service.deleteTask(firstId);

    const secondPage = service.listTaskPage({
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(secondPage).toEqual({
      items: [
        expect.objectContaining({ id: secondId, title: "Second" }),
        expect.objectContaining({ id: thirdId, title: "Third" }),
      ],
      nextCursor: null,
      total: 2,
    });
    expect(service.getTaskById(secondId)?.title).toBe("Second");
  });

  it("paginates activities in insertion order when timestamps match", () => {
    service.createTask({ title: "Activity source" });
    service.updateTask(firstId, { description: "Updated" });
    service.updateTaskStatus(firstId, "completed");

    const firstPage = service.listActivityPage({ limit: 2 });
    const secondPage = service.listActivityPage({
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(firstPage.items.map(({ type }) => type)).toEqual([
      "status-changed",
      "updated",
    ]);
    expect(firstPage.total).toBe(3);
    expect(secondPage.items.map(({ type }) => type)).toEqual(["created"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("rejects a malformed task cursor", () => {
    expect(() => service.listTaskPage({ cursor: "not-a-cursor" })).toThrow(
      InvalidCursorError,
    );
  });

  it("does not record an update when normalized content is unchanged", () => {
    service.createTask({
      title: "Stable task",
      description: "Stable description",
    });

    currentTime = 200;
    const task = service.updateTask(firstId, {
      title: "  Stable task  ",
      description: "  Stable description  ",
    });

    expect(task).toMatchObject({
      title: "Stable task",
      description: "Stable description",
    });
    expect(service.listRecentActivities()).toHaveLength(1);
  });

  it("filters tasks, orders them by creation date and builds the summary", () => {
    service.createTask({ title: "First" });
    service.updateTaskStatus(firstId, "completed");

    currentId = secondId;
    currentTime = 200;
    service.createTask({ title: "Second" });

    expect(service.listTasks().map(({ id }) => id)).toEqual([
      secondId,
      firstId,
    ]);
    expect(service.listTasks("completed").map(({ id }) => id)).toEqual([
      firstId,
    ]);
    expect(service.getTaskSummary()).toEqual({
      total: 2,
      byStatus: {
        pending: 1,
        "in-progress": 0,
        completed: 1,
      },
    });
  });

  it("returns undefined or false when the target does not exist", () => {
    expect(service.getTaskById(firstId)).toBeUndefined();
    expect(service.updateTask(firstId, { title: "Missing" })).toBeUndefined();
    expect(service.updateTaskStatus(firstId, "completed")).toBeUndefined();
    expect(service.deleteTask(firstId)).toBe(false);
    expect(service.listRecentActivities()).toEqual([]);
  });
});
