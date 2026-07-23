export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
}

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  const payload: CursorPayload = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  const json = Buffer.from(cursor, 'base64url').toString('utf-8');
  return JSON.parse(json) as CursorPayload;
}
