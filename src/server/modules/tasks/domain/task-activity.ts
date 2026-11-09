// Activity types describe every task change retained in the history.
export const TASK_ACTIVITY_TYPES = [
  "created",
  "updated",
  "status-changed",
  "deleted",
] as const;

export type TaskActivityType = (typeof TASK_ACTIVITY_TYPES)[number];

// Each activity is a snapshot, so its context survives later task changes.
export interface TaskActivity {
  id: string;
  taskId: string;
  taskTitle: string;
  type: TaskActivityType;
  description: string;
  occurredAt: number;
}
