import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../domain/cursor-page";
import { TASK_STATUSES } from "../domain/task-status";
import {
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
} from "../domain/task.rules";

// Shared field schemas keep create and update validation aligned.
const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title is required" })
  .max(TASK_TITLE_MAX_LENGTH, {
    message: `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters long`,
  });
const descriptionSchema = z
  .string()
  .trim()
  .max(TASK_DESCRIPTION_MAX_LENGTH, {
    message: `Description must be at most ${TASK_DESCRIPTION_MAX_LENGTH} characters long`,
  })
  .optional();

// Pagination defaults and limits mirror the domain-level contract.
const pageLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE);
const cursorSchema = z.string().min(1).max(512).optional();

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const taskIdSchema = z.object({
  id: z.uuid({ message: "Invalid task identifier" }),
});

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
});

export const updateTaskSchema = z
  .object({
    id: z.uuid(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
  })
  // A partial update is valid only when it contains an actual change.
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
  });

export const updateTaskStatusSchema = z.object({
    id: z.uuid(),
    status: taskStatusSchema,
});

export const listTasksSchema = z.object({
  status: taskStatusSchema.optional(),
}).optional();

export const listTaskPageSchema = z.object({
  limit: pageLimitSchema,
  cursor: cursorSchema,
  status: taskStatusSchema.optional(),
}).optional();

export const listTaskActivitiesSchema = z.object({
  limit: pageLimitSchema,
}).optional();

export const listTaskActivitiesPageSchema = z.object({
  limit: pageLimitSchema,
  cursor: cursorSchema,
}).optional();
