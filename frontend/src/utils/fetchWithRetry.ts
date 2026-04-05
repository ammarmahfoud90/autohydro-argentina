/**
 * Wraps fetch() with automatic retry logic for cold-start scenarios
 * (e.g. the first request to a Render.com free-tier server that needs to spin up).
 *
 * Retries on network errors (fetch throws) or 5xx responses.
 * Non-5xx HTTP errors are returned immediately without retry.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelay = 3000,
): Promise<Response> {
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
      // Only retry on 5xx (server errors); return everything else immediately
      if (res.ok || res.status < 500) return res;
      // 5xx — treat as retriable
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err as Error;
    }

    if (attempt < retries - 1) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, baseDelay * (attempt + 1)),
      );
    }
  }

  throw lastError;
}
