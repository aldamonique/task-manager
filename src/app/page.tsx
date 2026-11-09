import { Dashboard } from "@/app/_components/dashboard/dashboard";

import { createCaller } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/init";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Calling tRPC on the server avoids an extra HTTP request during rendering.
  const caller = createCaller(createTRPCContext());
  const currentTime = Date.now();

  // These requests are independent, so they can be resolved in parallel.
  const [tasks, initialTaskPage, summary, initialActivityPage] = await Promise.all([
    caller.tasks.list(),
    caller.tasks.listPage({ limit: 5 }),
    caller.tasks.summary(),
    caller.tasks.activitiesPage({ limit: 5 }),
  ]);

  return (
    <main>
      <Dashboard
        tasks={tasks}
        initialTaskPage={initialTaskPage}
        summary={summary}
        initialActivityPage={initialActivityPage}
        currentTime={currentTime}
      />
    </main>
  );
}
