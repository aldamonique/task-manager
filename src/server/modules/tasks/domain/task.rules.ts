// Domain limits remain authoritative even when tasks bypass the API layer.
export const TASK_TITLE_MAX_LENGTH = 100;
export const TASK_DESCRIPTION_MAX_LENGTH = 500;

// Validation errors identify business-rule failures without transport concerns.
export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

// Normalize before validation so whitespace does not count as task content.
export function normalizeTaskTitle(title: string): string {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new TaskValidationError("Task title is required");
  }

  if (normalizedTitle.length > TASK_TITLE_MAX_LENGTH) {
    throw new TaskValidationError(
      `Task title must be at most ${TASK_TITLE_MAX_LENGTH} characters long`,
    );
  }

  return normalizedTitle;
}

// Optional descriptions use an empty string as their normalized domain value.
export function normalizeTaskDescription(description = ""): string {
  const normalizedDescription = description.trim();

  if (normalizedDescription.length > TASK_DESCRIPTION_MAX_LENGTH) {
    throw new TaskValidationError(
      `Task description must be at most ${TASK_DESCRIPTION_MAX_LENGTH} characters long`,
    );
  }

  return normalizedDescription;
}
