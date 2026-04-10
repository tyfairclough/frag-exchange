/** Walk Error.cause and common driver fields for host logs (no secrets). */
export function serializeDbError(err: unknown, depth = 0): Record<string, unknown> {
  if (depth > 6) {
    return { truncated: true };
  }
  if (err == null) {
    return { value: String(err) };
  }
  if (typeof err !== "object") {
    return { message: String(err) };
  }

  const o = err as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof o.message === "string") out.message = o.message;
  if (typeof o.name === "string") out.name = o.name;
  if (typeof o.code === "string" || typeof o.code === "number") out.code = o.code;
  if (typeof o.errno === "number") out.errno = o.errno;
  if (typeof o.sqlState === "string") out.sqlState = o.sqlState;
  if (typeof o.sqlMessage === "string") out.sqlMessage = o.sqlMessage;

  if (o.cause !== undefined) {
    out.cause = serializeDbError(o.cause, depth + 1);
  }

  return out;
}
