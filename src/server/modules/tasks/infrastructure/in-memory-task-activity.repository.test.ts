import { describe, expect, it } from "vitest";

import { InvalidCursorError } from "../domain/cursor-page";
import type { TaskActivity } from "../domain/task-activity";
import { InMemoryTaskActivityRepository } from "./in-memory-task-activity.repository";

function createActivity(
  id: string,
  occurredAt: number,
  taskTitle: string,
): TaskActivity {
  return {
    id,
    taskId: "task-id",
    taskTitle,
    type: "updated",
    description: "Task details updated",
    occurredAt,
  };
}

describe("InMemoryTaskActivityRepository", () => {
  it("appends activities and uses insertion order to break timestamp ties", () => {
    const repository = new InMemoryTaskActivityRepository();

    repository.append(createActivity("activity-1", 100, "First"));
    repository.append(createActivity("activity-2", 100, "Second"));

    expect(
      repository.findRecent(10).map(({ taskTitle }) => taskTitle),
    ).toEqual(["Second", "First"]);
  });

  it("returns the newest activities up to the requested limit", () => {
    const repository = new InMemoryTaskActivityRepository();

    repository.append(createActivity("activity-1", 100, "Oldest"));
    repository.append(createActivity("activity-2", 300, "Newest"));
    repository.append(createActivity("activity-3", 200, "Middle"));

    expect(repository.findRecent(2).map(({ id }) => id)).toEqual([
      "activity-2",
      "activity-3",
    ]);
  });

  it("paginates activities with a stable cursor and total", () => {
    const repository = new InMemoryTaskActivityRepository();

    repository.append(createActivity("activity-1", 100, "First"));
    repository.append(createActivity("activity-2", 100, "Second"));
    repository.append(createActivity("activity-3", 100, "Third"));

    const firstPage = repository.findPage(2);
    const secondPage = repository.findPage(2, firstPage.nextCursor ?? undefined);

    expect(firstPage).toMatchObject({
      total: 3,
      nextCursor: "activity-2",
    });
    expect(firstPage.items.map(({ id }) => id)).toEqual([
      "activity-3",
      "activity-2",
    ]);
    expect(secondPage).toEqual({
      items: [expect.objectContaining({ id: "activity-1" })],
      nextCursor: null,
      total: 3,
    });
    expect(() => repository.findPage(2, "unknown")).toThrow(
      InvalidCursorError,
    );
  });

  it("does not expose mutable references to its internal state", () => {
    const repository = new InMemoryTaskActivityRepository();
    const activity = createActivity("activity-1", 100, "Original");

    repository.append(activity);
    // Mutations on either side of a read must not leak into stored history.
    activity.taskTitle = "Changed before reading";

    const [storedActivity] = repository.findPage(1).items;
    storedActivity.taskTitle = "Changed after reading";

    expect(repository.findRecent(1)[0]?.taskTitle).toBe("Original");
  });
});
