import type { TaskActivity } from "./task-activity";
import type { CursorPage } from "./cursor-page";

// The service depends on this contract rather than a specific storage method.
export interface TaskActivityRepository {
  findRecent(limit: number): TaskActivity[];
  findPage(limit: number, cursor?: string): CursorPage<TaskActivity>;
  append(activity: TaskActivity): void;
}
