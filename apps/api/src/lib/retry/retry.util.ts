export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<new (...args: unknown[]) => Error>;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<
  Omit<RetryOptions, "retryableErrors" | "onRetry">
> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

export function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, initialDelay, maxDelay, backoffFactor } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const runAttempt = async (attempt: number): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      const currentError = error as Error;

      if (
        options.retryableErrors &&
        !options.retryableErrors.some(
          (ErrorClass) => error instanceof ErrorClass,
        )
      ) {
        throw error;
      }

      if (attempt >= maxAttempts) {
        throw currentError;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay,
      );

      if (options.onRetry) {
        options.onRetry(attempt, currentError);
      }

      await sleep(delay);
      return runAttempt(attempt + 1);
    }
  };

  return runAttempt(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {},
): T {
  return ((...args: unknown[]) => retry(() => fn(...args), options)) as T;
}
