/** Shared by server (`db-warm.ts`) and client error boundaries — no Prisma imports. */
export class DatabaseUnavailableError extends Error {
  readonly code = "DATABASE_UNAVAILABLE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

export function isDatabaseUnavailableError(err: unknown): err is DatabaseUnavailableError {
  return err instanceof DatabaseUnavailableError;
}
