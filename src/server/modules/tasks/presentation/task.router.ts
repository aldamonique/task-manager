import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import {
  createTaskSchema,
  listTaskActivitiesSchema,
  listTaskActivitiesPageSchema,
  listTaskPageSchema,
  listTasksSchema,
  taskIdSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./task.schemas";
import { TRPCError } from "@trpc/server";

// The router handles transport concerns and delegates business rules to the service.
export const taskRouter = createTRPCRouter({
  // Read operations
  list: publicProcedure.input(listTasksSchema).query(({ ctx, input }) => {
    return ctx.taskService.listTasks(input?.status);
  }),

  listPage: publicProcedure
    .input(listTaskPageSchema)
    .query(({ ctx, input }) => {
      return ctx.taskService.listTaskPage(input);
    }),

  summary: publicProcedure.query(({ ctx }) => {
    return ctx.taskService.getTaskSummary();
  }),

  activities: publicProcedure
    .input(listTaskActivitiesSchema)
    .query(({ ctx, input }) => {
      return ctx.taskService.listRecentActivities(input?.limit);
    }),

  activitiesPage: publicProcedure
    .input(listTaskActivitiesPageSchema)
    .query(({ ctx, input }) => {
      return ctx.taskService.listActivityPage(input);
    }),

  getById: publicProcedure
    .input(taskIdSchema)
    .query(({ ctx, input }) => {
      const task = ctx.taskService.getTaskById(input.id);

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  // Write operations
  create: publicProcedure
    .input(createTaskSchema)
    .mutation(({ ctx, input }) => {
      return ctx.taskService.createTask(input);
    }),

  update: publicProcedure
    .input(updateTaskSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...changes } = input;

      const task = ctx.taskService.updateTask(id, changes);

      // Missing domain results become explicit API-level errors.
      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  updateStatus: publicProcedure
    .input(updateTaskStatusSchema)
    .mutation(({ ctx, input }) => {
      const task = ctx.taskService.updateTaskStatus(
        input.id,
        input.status
      );

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  delete: publicProcedure
    .input(taskIdSchema)
    .mutation(({ ctx, input }) => {
      const deleted = ctx.taskService.deleteTask(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return {
        success: true,
        id: input.id,
      };
    }),
});
