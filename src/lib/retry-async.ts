/**
 * Best-effort retries for outbound I/O (email, webhooks). Caller decides which errors are retryable.
 */
export async function withAsyncRetries<T>(
  fn: (attempt: number) => Promise<T>,
  options: { attempts: number; delayMs: number; retryIf: (err: unknown) => boolean },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      if (attempt === options.attempts - 1 || !options.retryIf(e)) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, options.delayMs));
    }
  }
  throw lastErr;
}
