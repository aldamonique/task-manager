import { describe, expect, it } from "vitest";
import type { Task } from "../domain/task.entity";
import { InMemoryTaskRepository } from "./in-memory-task.repository";

const task: Task = {
  id: "task-id",
  title: "Write tests",
  description: "Cover the repository",
  status: "pending",
  createdAt: 1,
};

describe("InMemoryTaskRepository", () => {
  it("stores, retrieves and deletes tasks", () => {
    const repository = new InMemoryTaskRepository();

    repository.save(task);

    expect(repository.findById(task.id)).toEqual(task);
    expect(repository.findAll()).toEqual([task]);
    expect(repository.delete(task.id)).toBe(true);
    expect(repository.findById(task.id)).toBeUndefined();
  });

  it("does not expose mutable references to its internal state", () => {
    const repository = new InMemoryTaskRepository();
    const savedTask = repository.save(task);

    // The returned value is a copy, not the object held by the repository.
    savedTask.title = "Changed outside the repository";

    expect(repository.findById(task.id)?.title).toBe("Write tests");
  });
});
