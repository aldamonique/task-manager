import { beforeEach, describe, expect, it } from "vitest";
import { TaskService } from "../application/task.service";
import { InMemoryTaskActivityRepository } from "../infrastructure/in-memory-task-activity.repository";
import { InMemoryTaskRepository } from "../infrastructure/in-memory-task.repository";
import { createCaller } from "@/server/trpc/root";

const taskId = "00000000-0000-4000-8000-000000000001";

describe("taskRouter", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    // A direct caller exercises the full router without an HTTP server.
    let activityIdSequence = 0;
    const taskService = new TaskService(
      new InMemoryTaskRepository(),
      new InMemoryTaskActivityRepository(),
      {
        generateId: () => taskId,
        generateActivityId: () => `activity-${++activityIdSequence}`,
        now: () => 100,
      },
    );

    caller = createCaller({ taskService });
  });

  it("executes the task lifecycle through tRPC", async () => {
    const created = await caller.tasks.create({
      title: "  Integration test  ",
      description: "  Through the router  ",
    });

    expect(created).toMatchObject({
      id: taskId,
      title: "Integration test",
      description: "Through the router",
      status: "pending",
    });

    await caller.tasks.updateStatus({ id: taskId, status: "in-progress" });

    expect(await caller.tasks.list({ status: "in-progress" })).toHaveLength(1);
    expect(await caller.tasks.summary()).toEqual({
      total: 1,
      byStatus: {
        pending: 0,
        "in-progress": 1,
        completed: 0,
      },
    });

    const taskPage = await caller.tasks.listPage({ status: "in-progress" });
    expect(taskPage).toEqual({
      items: [expect.objectContaining({ id: taskId })],
      nextCursor: null,
      total: 1,
    });

    await caller.tasks.delete({ id: taskId });
    expect(await caller.tasks.list()).toEqual([]);

    const activities = await caller.tasks.activities({ limit: 10 });
    expect(activities.map(({ type }) => type)).toEqual([
      "deleted",
      "status-changed",
      "created",
    ]);
    expect(activities.every(({ occurredAt }) => occurredAt === 100)).toBe(true);

    const firstActivityPage = await caller.tasks.activitiesPage({ limit: 2 });
    const secondActivityPage = await caller.tasks.activitiesPage({
      cursor: firstActivityPage.nextCursor ?? undefined,
    });

    expect(firstActivityPage.items.map(({ type }) => type)).toEqual([
      "deleted",
      "status-changed",
    ]);
    expect(firstActivityPage.total).toBe(3);
    expect(secondActivityPage.items.map(({ type }) => type)).toEqual([
      "created",
    ]);
    expect(secondActivityPage.nextCursor).toBeNull();
  });

  it("returns NOT_FOUND for an unknown task", async () => {
    await expect(caller.tasks.getById({ id: taskId })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Task not found",
    });
  });

  it("rejects invalid input before reaching the service", async () => {
    await expect(caller.tasks.create({ title: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("maps invalid pagination cursors to BAD_REQUEST", async () => {
    await expect(
      caller.tasks.listPage({ cursor: "invalid" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid pagination cursor",
    });

    await expect(
      caller.tasks.activitiesPage({ cursor: "missing-activity" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid pagination cursor",
    });
  });
});
