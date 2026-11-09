"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { trpcClient } from "@/trpc/client";

import type { CursorPage } from "@/server/modules/tasks/domain/cursor-page";
import type { Task } from "@/server/modules/tasks/domain/task.entity";
import type { TaskStatus } from "@/server/modules/tasks/domain/task-status";
import { ListTodo } from "lucide-react";
import { TaskFilter, type TaskStatusFilter } from "./task-filter";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import styles from "./task-manager.module.css";

interface TaskManagerProps {
  initialPage: CursorPage<Task>;
}

const PAGE_SIZE = 5;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

export function TaskManager({
  initialPage,
}: TaskManagerProps) {
  const router = useRouter();

  const [tasks, setTasks] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [totalTasks, setTotalTasks] = useState(initialPage.total);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Generations prevent an older request from replacing newer filter results.
  const feedGeneration = useRef(0);
  // This lock closes the gap before the loading state is rendered.
  const loadingMore = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadTasks = useCallback(async (
    filter: TaskStatusFilter,
    clearCurrentPage = false,
  ) => {
    // Every full reload invalidates pending pagination requests.
    const generation = feedGeneration.current + 1;
    feedGeneration.current = generation;
    loadingMore.current = false;
    setIsLoadingMore(false);
    setIsReloading(true);

    if (clearCurrentPage) {
      setTasks([]);
      setNextCursor(null);
      setTotalTasks(0);
    }

    try {
      const page = await trpcClient.tasks.listPage.query({
        limit: PAGE_SIZE,
        status: filter === "all" ? undefined : filter,
      });

      // Ignore responses that belong to a previous filter or reload.
      if (feedGeneration.current !== generation) return;

      setTasks(page.items);
      setNextCursor(page.nextCursor);
      setTotalTasks(page.total);
    } catch (error) {
      if (feedGeneration.current === generation) {
        setError(getErrorMessage(error));
      }
    } finally {
      if (feedGeneration.current === generation) {
        setIsReloading(false);
      }
    }
  }, []);

  const loadMoreTasks = useCallback(async () => {
    if (!nextCursor || loadingMore.current) return;

    const generation = feedGeneration.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await trpcClient.tasks.listPage.query({
        cursor: nextCursor,
        limit: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      if (feedGeneration.current !== generation) return;

      setTasks((currentTasks) => {
        // De-duplicate items in case data changes between cursor requests.
        const knownTaskIds = new Set(currentTasks.map(({ id }) => id));
        const newTasks = page.items.filter(({ id }) => !knownTaskIds.has(id));
        return [...currentTasks, ...newTasks];
      });
      setNextCursor(page.nextCursor);
      setTotalTasks(page.total);
    } catch (error) {
      if (feedGeneration.current === generation) {
        setError(getErrorMessage(error));
      }
    } finally {
      if (feedGeneration.current === generation) {
        loadingMore.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [nextCursor, statusFilter]);

  function handleFilterChange(filter: TaskStatusFilter) {
    setStatusFilter(filter);
    setError(null);
    setSuccess(null);
    void reloadTasks(filter, true);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setEditingTaskId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const input = {
        title: title.trim(),
        description: description.trim(),
      };

      if (editingTaskId) {
        await trpcClient.tasks.update.mutate({
          id: editingTaskId,
          ...input,
        });

        setSuccess("Task updated successfully");
      } else {
        await trpcClient.tasks.create.mutate(input);

        setSuccess("Task created successfully");
      }

      resetForm();

      await reloadTasks(statusFilter);
      // Refresh server-rendered metrics and activity after each mutation.
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(task: Task) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");

    setError(null);
    setSuccess(null);
  }

  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setBusyTaskId(taskId);
    setError(null);
    setSuccess(null);

    try {
      await trpcClient.tasks.updateStatus.mutate({
        id: taskId,
        status,
      });

      setSuccess("Task status updated successfully");

      await reloadTasks(statusFilter);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDelete(taskId: string) {
    const confirmed = window.confirm(
      "Delete this task permanently?"
    );

    if (!confirmed) return;

    setBusyTaskId(taskId);
    setError(null);
    setSuccess(null);

    try {
      await trpcClient.tasks.delete.mutate({
        id: taskId,
      });

      setSuccess("Task deleted successfully");

      if (editingTaskId === taskId) {
        resetForm();
      }

      await reloadTasks(statusFilter);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <>
      {error && <p className={styles.feedback} data-kind="error" role="alert">{error}</p>}

      {success && <p className={styles.feedback} data-kind="success" role="status">{success}</p>}

        <section id="tasks" className={`${styles.panel} ${styles.tasksPanel}`} aria-labelledby="tasks-title">
          <header className={styles.panelHeader}>
            <div className={styles.headingGroup}>
              <span className={styles.headingIcon}>
                <ListTodo size={17} aria-hidden="true" />
              </span>
              <h2 id="tasks-title">My Tasks</h2>
              <span className={styles.taskCount}>
                {tasks.length} of {totalTasks}
              </span>
            </div>

            <TaskFilter value={statusFilter} onChange={handleFilterChange} />
          </header>

          <TaskList
            tasks={tasks}
            busyTaskId={busyTaskId}
            hasMore={nextCursor !== null}
            isLoadingMore={isLoadingMore}
            isReloading={isReloading}
            onEdit={handleEdit}
            onDelete={(taskId) => void handleDelete(taskId)}
            onLoadMore={() => void loadMoreTasks()}
            onStatusChange={(taskId, status) =>
              void handleStatusChange(taskId, status)
            }
          />
        </section>

        <TaskForm
          title={title}
          description={description}
          isEditing={editingTaskId !== null}
          isSubmitting={isSubmitting}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onCancel={resetForm}
          onSubmit={handleSubmit}
        />
    </>
  );
}
