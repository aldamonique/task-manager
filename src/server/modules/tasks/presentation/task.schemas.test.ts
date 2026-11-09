import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  listTaskActivitiesSchema,
  listTaskActivitiesPageSchema,
  listTaskPageSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./task.schemas";

const taskId = "00000000-0000-4000-8000-000000000001";

// Schema tests focus on normalization and rejection at the API boundary.
describe("task schemas", () => {
  it("normalizes valid creation input", () => {
    expect(
      createTaskSchema.parse({
        title: "  Test schemas  ",
        description: "  At the boundary  ",
      }),
    ).toEqual({
      title: "Test schemas",
      description: "At the boundary",
    });
  });

  it("rejects blank titles", () => {
    expect(() => createTaskSchema.parse({ title: "   " })).toThrow();
  });

  it("requires at least one editable field on update", () => {
    expect(() => updateTaskSchema.parse({ id: taskId })).toThrow();
  });

  it("accepts only known statuses", () => {
    expect(
      updateTaskStatusSchema.parse({ id: taskId, status: "completed" }),
    ).toEqual({ id: taskId, status: "completed" });
    expect(() =>
      updateTaskStatusSchema.parse({ id: taskId, status: "archived" }),
    ).toThrow();
  });

  it("defaults and constrains the recent activity limit", () => {
    expect(listTaskActivitiesSchema.parse({})).toEqual({ limit: 5 });
    expect(listTaskActivitiesSchema.parse({ limit: 20 })).toEqual({
      limit: 20,
    });

    expect(() => listTaskActivitiesSchema.parse({ limit: 0 })).toThrow();
    expect(() => listTaskActivitiesSchema.parse({ limit: 1.5 })).toThrow();
    expect(() => listTaskActivitiesSchema.parse({ limit: 21 })).toThrow();
  });

  it("validates task and activity pagination input", () => {
    expect(listTaskPageSchema.parse({})).toEqual({ limit: 5 });
    expect(
      listTaskPageSchema.parse({
        cursor: "opaque-cursor",
        status: "pending",
      }),
    ).toEqual({
      limit: 5,
      cursor: "opaque-cursor",
      status: "pending",
    });
    expect(listTaskActivitiesPageSchema.parse({})).toEqual({ limit: 5 });

    expect(() => listTaskPageSchema.parse({ cursor: "" })).toThrow();
    expect(() =>
      listTaskActivitiesPageSchema.parse({ limit: 21 }),
    ).toThrow();
  });
});
