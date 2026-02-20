// ── Scanner Utility Functions ─────────────────────────────────────────────

interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

/**
 * Fetch with automatic retry and timeout.
 * Retries on network errors and 5xx responses.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries = 2, retryDelay = 1000, timeoutMs = 10000, ...fetchOptions } = options;

  // Ensure User-Agent and timeout
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'TestMe-Security-Scanner/1.0');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || AbortSignal.timeout(timeoutMs),
      });

      // Retry on 5xx errors (server issues)
      if (response.status >= 500 && attempt < retries) {
        await delay(retryDelay * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt < retries) {
        // Check if abort was intentional
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Timeout - retry
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        // Network error - retry
        await delay(retryDelay * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  // Should never reach here, but just in case
  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Truncate string for display
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '…';
}

/**
 * Batch execute promises with concurrency limit
 */
export async function batchExecute<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((t) => t()));
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }
  return results;
}
