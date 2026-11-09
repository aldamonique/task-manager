import type { TaskActivity } from "../domain/task-activity";
import type { TaskActivityRepository } from "../domain/task-activity.repository";
import {
  InvalidCursorError,
  type CursorPage,
} from "../domain/cursor-page";

interface StoredActivity {
  activity: TaskActivity;
  // Insertion order provides a deterministic fallback for equal timestamps.
  insertionOrder: number;
}

export class InMemoryTaskActivityRepository implements TaskActivityRepository {
  private readonly activities: StoredActivity[] = [];
  private nextInsertionOrder = 0;

  findRecent(limit: number): TaskActivity[] {
    return this.getOrderedActivities()
      .slice(0, limit)
      .map(({ activity }) => ({ ...activity }));
  }

  findPage(
    limit: number,
    cursor?: string,
  ): CursorPage<TaskActivity> {
    const orderedActivities = this.getOrderedActivities();
    let startIndex = 0;

    if (cursor) {
      // Activity IDs are stable cursor anchors within this in-memory store.
      const cursorIndex = orderedActivities.findIndex(
        ({ activity }) => activity.id === cursor,
      );

      if (cursorIndex === -1) {
        throw new InvalidCursorError();
      }

      startIndex = cursorIndex + 1;
    }

    const pageEntries = orderedActivities.slice(
      startIndex,
      startIndex + limit,
    );
    const hasNextPage = startIndex + pageEntries.length < orderedActivities.length;

    return {
      items: pageEntries.map(({ activity }) => ({ ...activity })),
      nextCursor: hasNextPage
        ? pageEntries.at(-1)?.activity.id ?? null
        : null,
      total: orderedActivities.length,
    };
  }

  append(activity: TaskActivity): void {
    // Store a copy so later caller mutations cannot rewrite history.
    this.activities.push({
      activity: { ...activity },
      insertionOrder: this.nextInsertionOrder,
    });
    this.nextInsertionOrder += 1;
  }

  private getOrderedActivities(): StoredActivity[] {
    // Work on a copy to keep reads from mutating repository order.
    return [...this.activities].sort(
      (first, second) =>
        second.activity.occurredAt - first.activity.occurredAt ||
        second.insertionOrder - first.insertionOrder,
    );
  }
}
