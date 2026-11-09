import type { Task } from "../domain/task.entity";
import type { TaskRepository } from "../domain/task.repository";

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  findAll(): Task[] {
    // Return copies so callers cannot mutate the repository by reference.
    return Array.from(this.tasks.values(), (task) => ({ ...task }));
  }

  findById(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  save(task: Task): Task {
    // Copy on both write and return to preserve repository ownership.
    this.tasks.set(task.id, { ...task });
    return { ...task };
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
