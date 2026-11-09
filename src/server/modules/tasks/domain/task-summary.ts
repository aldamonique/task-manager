import type {TaskStatus} from "./task-status";

// The summary provides total and per-status counts for dashboard metrics.
export interface TaskSummary {
    total: number;
    byStatus: Record<TaskStatus, number>;
}
