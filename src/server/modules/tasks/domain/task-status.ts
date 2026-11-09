// Keeping statuses as a fixed set prevents unsupported workflow states.
export const TASK_STATUSES = ['pending', 'in-progress', 'completed'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
