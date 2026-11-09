"use client";

import {
  Check,
  CirclePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState, type UIEvent } from "react";

import { ClientDateTime } from "@/components/ui/client-date-time";
import type { CursorPage } from "@/server/modules/tasks/domain/cursor-page";
import { trpcClient } from "@/trpc/client";
import type {
  TaskActivity,
  TaskActivityType,
} from "@/server/modules/tasks/domain/task-activity";

import styles from "./dashboard.module.css";

interface RecentActivitiesProps {
  initialPage: CursorPage<TaskActivity>;
}

const PAGE_SIZE = 5;

// Activity types define their own visual treatment in one place.
const activityPresentation: Record<
  TaskActivityType,
  {
    label: string;
    icon: typeof Check;
    tone: "green" | "blue" | "coral" | "slate";
  }
> = {
  created: {
    label: "Task created",
    icon: CirclePlus,
    tone: "blue",
  },
  updated: {
    label: "Task updated",
    icon: Pencil,
    tone: "coral",
  },
  "status-changed": {
    label: "Status changed",
    icon: RefreshCw,
    tone: "green",
  },
  deleted: {
    label: "Task deleted",
    icon: Trash2,
    tone: "slate",
  },
};

export function RecentActivities({ initialPage }: RecentActivitiesProps) {
  const [activities, setActivities] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [totalActivities, setTotalActivities] = useState(initialPage.total);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // A ref blocks overlapping requests before React can commit a state update.
  const loadingMore = useRef(false);

  const loadMoreActivities = useCallback(async () => {
    if (!nextCursor || loadingMore.current) return;

    loadingMore.current = true;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const page = await trpcClient.tasks.activitiesPage.query({
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });

      setActivities((currentActivities) => {
        // Cursor pages may overlap after concurrent changes, so merge by ID.
        const knownActivityIds = new Set(
          currentActivities.map(({ id }) => id),
        );
        const newActivities = page.items.filter(
          ({ id }) => !knownActivityIds.has(id),
        );
        return [...currentActivities, ...newActivities];
      });
      setNextCursor(page.nextCursor);
      setTotalActivities(page.total);
    } catch {
      setLoadError("Could not load more activity. Please try again.");
    } finally {
      loadingMore.current = false;
      setIsLoadingMore(false);
    }
  }, [nextCursor]);

  function handleScroll(event: UIEvent<HTMLOListElement>) {
    const list = event.currentTarget;
    const distanceFromEnd = list.scrollHeight - list.scrollTop - list.clientHeight;

    // Start loading shortly before the user reaches the end of the list.
    if (nextCursor && !isLoadingMore && distanceFromEnd < 96) {
      void loadMoreActivities();
    }
  }

  return (
    <article
      id="recent-activities"
      className={`${styles.card} ${styles.recentCard}`}
    >
      <header className={styles.cardHeader}>
        <span className={styles.cardIcon}>
          <RefreshCw size={17} aria-hidden="true" />
        </span>
        <h2>Recent Activities</h2>
        <span className={styles.cardMeta}>
          {activities.length} of {totalActivities}
        </span>
      </header>

      {activities.length ? (
        <ol
          className={styles.activityList}
          aria-busy={isLoadingMore}
          aria-label="Recent activity. Scroll vertically to load more."
          onScroll={handleScroll}
          tabIndex={0}
        >
          {activities.map((activity) => {
            const presentation = activityPresentation[activity.type];
            const Icon = presentation.icon;

            return (
              <li key={activity.id}>
                <span
                  className={styles.activityIcon}
                  data-tone={presentation.tone}
                >
                  <Icon size={15} aria-hidden="true" />
                </span>

                <div className={styles.activityCopy}>
                  <strong>{presentation.label}</strong>
                  <p>{activity.taskTitle}</p>
                  <small>{activity.description}</small>
                </div>

                <ClientDateTime
                  className={styles.activityTime}
                  timestamp={activity.occurredAt}
                />
              </li>
            );
          })}

          {nextCursor && (
            <li className={styles.activityLoadMore}>
              {loadError && <span>{loadError}</span>}
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => void loadMoreActivities()}
              >
                {isLoadingMore
                  ? "Loading more…"
                  : loadError
                    ? "Try again"
                    : "Load more activity"}
              </button>
            </li>
          )}
        </ol>
      ) : (
        <div className={styles.emptyActivities}>
          <span>↻</span>
          <p>Task activity with local date and time will appear here.</p>
        </div>
      )}

      <span className={styles.srOnly} aria-live="polite">
        {isLoadingMore
          ? "Loading more recent activity"
          : `${activities.length} recent activities loaded`}
      </span>
    </article>
  );
}
