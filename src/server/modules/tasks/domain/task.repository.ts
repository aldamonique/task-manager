import type { Task } from "./task.entity";

// This contract keeps task operations independent of their storage backend.
export interface TaskRepository {
  findAll(): Task[];
  findById(id: string): Task | undefined;
  save(task: Task): Task;
  delete(id: string): boolean;
}
