import { initTRPC, TRPCError } from "@trpc/server";
import { getTaskService } from "@/server/modules/tasks/composition/task.module";
import type { TaskService } from "@/server/modules/tasks/application/task.service";
import { InvalidCursorError } from "@/server/modules/tasks/domain/cursor-page";
import { TaskValidationError } from "@/server/modules/tasks/domain/task.rules";

export interface TRPCContext {
  taskService: TaskService;
}

// The context exposes application services without coupling procedures to storage.
export const createTRPCContext = (): TRPCContext => ({
  taskService: getTaskService(),
});

const t = initTRPC
  .context<TRPCContext>()
  .create();

// Domain validation failures are safe client errors, not server failures.
const mapDomainErrors = t.middleware(async ({ next }) => {
  const result = await next();

  if (!result.ok) {
    const error = result.error.cause;

    if (
      error instanceof TaskValidationError ||
      error instanceof InvalidCursorError ||
      // Preserve the mapping if errors cross a boundary that loses prototypes.
      (error instanceof Error &&
        ["TaskValidationError", "InvalidCursorError"].includes(error.name))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
        cause: error,
      });
    }
  }

  return result;
});

export const createTRPCRouter = t.router;
// Every public procedure receives the same domain-error translation.
export const publicProcedure = t.procedure.use(mapDomainErrors);

export const createCallerFactory = t.createCallerFactory;
