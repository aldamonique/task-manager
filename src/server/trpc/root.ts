import {
  createCallerFactory,
  createTRPCRouter,
} from "./init";

import { taskRouter } from "@/server/modules/tasks/presentation/task.router";

// Feature routers are composed here into the application's public API.
export const appRouter = createTRPCRouter({
  tasks: taskRouter,
});

// Exporting the router type keeps the browser client fully type-safe.
export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
