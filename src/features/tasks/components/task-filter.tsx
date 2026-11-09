import {
  TASK_STATUSES,
  type TaskStatus,
} from "@/server/modules/tasks/domain/task-status";
import styles from "./task-manager.module.css";

// "all" belongs to the UI filter and is not a persisted task status.
export type TaskStatusFilter = TaskStatus | "all";

interface TaskFilterProps {
  value: TaskStatusFilter;
  onChange: (status: TaskStatusFilter) => void;
}

export function TaskFilter({ value, onChange }: TaskFilterProps) {
  return (
    <div className={styles.filter}>
      <label htmlFor="status-filter">Status</label>

      <select
        id="status-filter"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as TaskStatusFilter)
        }
      >
        <option value="all">All Tasks</option>

        {TASK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace("-", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
