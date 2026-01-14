/**
 * Utility functions for promise handling
 * Helps prevent hanging promises and improves error handling
 */

/**
 * Wraps a promise with a timeout
 * If the promise doesn't resolve within the timeout, it rejects with a TimeoutError
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms / 30 seconds)
 * @param timeoutMessage - Custom message for timeout error
 * @returns The wrapped promise
 * 
 * @example
 * ```ts
 * const result = await withTimeout(
 *   supabase.from('users').select('*'),
 *   10000,
 *   'La consulta tardó demasiado'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  timeoutMessage: string = "La operación tardó demasiado tiempo"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Custom error class for timeout errors
 * Allows distinguishing timeout errors from other errors
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Safely executes an async function, returning a tuple of [error, result]
 * Prevents unhandled promise rejections
 * 
 * @param promise - The promise to execute
 * @returns A tuple of [error, result] where one is always null
 * 
 * @example
 * ```ts
 * const [error, data] = await safeAsync(fetchData());
 * if (error) {
 *   console.error('Error:', error);
 *   return;
 * }
 * console.log('Data:', data);
 * ```
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

/**
 * Combines withTimeout and safeAsync for safe async operations with timeout
 * 
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms)
 * @param timeoutMessage - Custom message for timeout error
 * @returns A tuple of [error, result]
 * 
 * @example
 * ```ts
 * const [error, data] = await safeAsyncWithTimeout(
 *   supabase.from('users').select('*'),
 *   10000
 * );
 * ```
 */
export async function safeAsyncWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  timeoutMessage?: string
): Promise<[Error, null] | [null, T]> {
  return safeAsync(withTimeout(promise, timeoutMs, timeoutMessage));
}

/**
 * Retries a promise-returning function multiple times
 * 
 * @param fn - Function that returns a promise
 * @param retries - Number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000ms)
 * @param shouldRetry - Optional function to determine if error is retryable
 * @returns The result of the function
 * 
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetchData(),
 *   3,
 *   1000,
 *   (error) => error.message.includes('network')
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt < retries) {
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Creates a deferred promise that can be resolved/rejected externally
 * Useful for bridging callback-based APIs with async/await
 * 
 * @returns An object with promise, resolve, and reject functions
 * 
 * @example
 * ```ts
 * const deferred = createDeferred<string>();
 * setTimeout(() => deferred.resolve('done'), 1000);
 * const result = await deferred.promise;
 * ```
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
