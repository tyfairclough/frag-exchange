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

/**
 * Retries `fn` with exponential backoff between attempts until `maxMs` elapses from the first call.
 * First attempt runs immediately; waits occur only after failures.
 */
export async function withExponentialBackoffUntil<T>(
  fn: () => Promise<T>,
  options: {
    maxMs: number;
    backoffStartMs: number;
    backoffCapMs: number;
    retryIf: (err: unknown) => boolean;
    onGiveUp: (lastErr: unknown) => never;
  },
): Promise<T> {
  const deadline = Date.now() + options.maxMs;
  let delay = options.backoffStartMs;
  let lastErr: unknown;

  while (true) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!options.retryIf(e)) {
        throw e;
      }
      const now = Date.now();
      if (now >= deadline) {
        options.onGiveUp(lastErr);
      }
      const wait = Math.min(delay, options.backoffCapMs, Math.max(0, deadline - now));
      if (wait <= 0) {
        options.onGiveUp(lastErr);
      }
      await new Promise((r) => setTimeout(r, wait));
      delay = Math.min(delay * 2, options.backoffCapMs);
    }
  }
}
