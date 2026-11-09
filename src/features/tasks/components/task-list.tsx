import type { Task } from "@/server/modules/tasks/domain/task.entity";
import {
  TASK_STATUSES,
  type TaskStatus,
} from "@/server/modules/tasks/domain/task-status";
import { ClipboardList, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import type { UIEvent } from "react";
import { ClientDateTime } from "@/components/ui/client-date-time";
import styles from "./task-manager.module.css";

interface TaskListProps {
  tasks: Task[];
  busyTaskId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  isReloading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onLoadMore: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function TaskList({
  tasks,
  busyTaskId,
  hasMore,
  isLoadingMore,
  isReloading,
  onEdit,
  onDelete,
  onLoadMore,
  onStatusChange,
}: TaskListProps) {
  if (isReloading) {
    return (
      <div className={styles.emptyState} role="status">
        <span className={styles.emptyIcon}>
          <LoaderCircle className={styles.loadingIcon} size={22} aria-hidden="true" />
        </span>
        <strong>Loading tasks</strong>
        <p>The first five matching tasks are being loaded.</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <ClipboardList size={22} aria-hidden="true" />
        </span>
        <strong>No tasks found</strong>
        <p>Create a task or change the active filter to see matching work here.</p>
      </div>
    );
  }

  function handleScroll(event: UIEvent<HTMLUListElement>) {
    const list = event.currentTarget;
    const distanceFromEnd = list.scrollHeight - list.scrollTop - list.clientHeight;

    // Preload the next page before the scrollbar reaches the bottom.
    if (hasMore && !isLoadingMore && distanceFromEnd < 96) {
      onLoadMore();
    }
  }

  return (
    <>
      <ul
        className={styles.taskList}
        aria-busy={isLoadingMore}
        aria-label="Tasks. Scroll vertically to load more."
        onScroll={handleScroll}
        tabIndex={0}
      >
        {tasks.map((task) => (
          <li className={styles.taskItem} key={task.id}>
            <article>
              <div className={styles.taskContent}>
                <span className={styles.taskInitial}>
                  {task.title.slice(0, 1).toUpperCase()}
                </span>
                <div className={styles.taskCopy}>
                  <h3>{task.title}</h3>
                  <p>{task.description || "No description"}</p>
                  <ClientDateTime
                    className={styles.taskDate}
                    timestamp={task.createdAt}
                  />
                </div>
              </div>

              <div className={styles.taskMeta}>
                <label htmlFor={`status-${task.id}`}>Status</label>

                <select
                  className={styles.statusSelect}
                  id={`status-${task.id}`}
                  value={task.status}
                  disabled={busyTaskId === task.id}
                  onChange={(event) =>
                    onStatusChange(
                      task.id,
                      event.target.value as TaskStatus,
                    )
                  }
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("-", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.taskActions}>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  disabled={busyTaskId === task.id}
                  aria-label={`Edit ${task.title}`}
                  title="Edit task"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  disabled={busyTaskId === task.id}
                  aria-label={`Delete ${task.title}`}
                  title="Delete task"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </article>
          </li>
        ))}

        {hasMore && (
          <li className={styles.loadMoreRow}>
            <button
              className={styles.loadMoreButton}
              type="button"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore ? "Loading more…" : "Load more tasks"}
            </button>
          </li>
        )}
      </ul>

      <span className={styles.srOnly} aria-live="polite">
        {isLoadingMore
          ? "Loading more tasks"
          : `${tasks.length} tasks loaded`}
      </span>
    </>
  );
}
