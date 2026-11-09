import type { TaskStatus } from "./task-status";

// This is the core task representation shared across the task domain.
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: number;
}
