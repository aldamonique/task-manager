// Shared bounds keep pagination consistent across application and API layers.
export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 20;

// Cursor-based queries return a page, the next position, and the full count.
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

// A dedicated error lets transport layers report invalid cursors safely.
export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "InvalidCursorError";
  }
}
