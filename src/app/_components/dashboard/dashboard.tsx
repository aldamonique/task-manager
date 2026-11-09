import { ChartNoAxesColumnIncreasing } from "lucide-react";
import type { CSSProperties } from "react";

import { TaskManager } from "@/features/tasks/components/task-manager";
import type { CursorPage } from "@/server/modules/tasks/domain/cursor-page";
import type { Task } from "@/server/modules/tasks/domain/task.entity";
import type { TaskSummary } from "@/server/modules/tasks/domain/task-summary";
import type { TaskActivity } from "@/server/modules/tasks/domain/task-activity";

import styles from "./dashboard.module.css";
import { RecentActivities } from "./recent-activities";

interface DashboardProps {
  tasks: Task[];
  summary: TaskSummary;
  initialTaskPage: CursorPage<Task>;
  initialActivityPage: CursorPage<TaskActivity>;
  currentTime: number;
}

export function Dashboard({
  tasks,
  summary,
  initialTaskPage,
  initialActivityPage,
  currentTime,
}: DashboardProps) {
  // Convert the completion rate to the angle used by the CSS progress ring.
  const completion = summary.total
    ? Math.round((summary.byStatus.completed / summary.total) * 100)
    : 0;
  const completionStyle = {
    "--completion": `${completion * 3.6}deg`,
  } as CSSProperties;

  return (
    <div id="dashboard" className={styles.dashboard}>
      <section className={styles.introduction} aria-labelledby="dashboard-title">
        <div>
          <h1 id="dashboard-title">Dashboard</h1>
        </div>

        <dl className={styles.metrics}>
          <div>
            <dd>{summary.total}</dd>
            <dt>Total tasks</dt>
          </div>
          <div>
            <dd>{summary.byStatus["in-progress"]}</dd>
            <dt>In progress</dt>
          </div>
          <div>
            <dd>{summary.byStatus.completed}</dd>
            <dt>Completed</dt>
          </div>
        </dl>
      </section>

      <section className={styles.bentoGrid} aria-label="Task dashboard">
        <article className={`${styles.card} ${styles.completionCard}`}>
          <header className={styles.cardHeader}>
            <span className={styles.cardIcon}>
              <ChartNoAxesColumnIncreasing size={17} aria-hidden="true" />
            </span>
            <h2>Task Completion</h2>
            <span className={styles.cardMeta}>Live</span>
          </header>

          <div className={styles.completionContent}>
            <div className={styles.completionRing} style={completionStyle}>
              <span>
                <strong>{completion}%</strong>
                completed
              </span>
            </div>

            <div className={styles.statusLegend}>
              <span><i data-color="pink" />{summary.byStatus.pending} pending</span>
              <span><i data-color="blue" />{summary.byStatus["in-progress"]} active</span>
              <span><i data-color="green" />{summary.byStatus.completed} done</span>
            </div>
          </div>
        </article>

        {/* Remount the feed when a server refresh returns a new activity head. */}
        <RecentActivities
          key={initialActivityPage.items[0]?.id ?? "empty-activity-feed"}
          initialPage={initialActivityPage}
        />

        <TaskManager initialPage={initialTaskPage} />
      </section>
    </div>
  );
}
