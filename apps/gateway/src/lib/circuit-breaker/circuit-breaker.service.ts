import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttempt: number;
    config: CircuitBreakerConfig;
  }>();

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    resetTimeout: 30000,
  };

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    config: Partial<CircuitBreakerConfig> = {},
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(key, config);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        this.logger.warn(`Circuit breaker ${key} is OPEN, rejecting request`);
        throw new CircuitBreakerError(
          `Circuit breaker ${key} is open. Service temporarily unavailable.`,
        );
      }
      this.logger.log(`Circuit breaker ${key} entering HALF_OPEN state`);
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successCount = 0;
    }

    try {
      const result = await Promise.race([
        fn(),
        this.timeout(circuit.config.timeout),
      ]);

      this.onSuccess(key);
      return result as T;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }

  private getOrCreateCircuit(key: string, config: Partial<CircuitBreakerConfig>) {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        nextAttempt: 0,
        config: { ...this.defaultConfig, ...config },
      });
    }
    return this.circuits.get(key)!;
  }

  private onSuccess(key: string) {
    const circuit = this.circuits.get(key);
    if (!circuit) return;

    circuit.failureCount = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      if (circuit.successCount >= circuit.config.successThreshold) {
        this.logger.log(`Circuit breaker ${key} moving to CLOSED state`);
        circuit.state = CircuitState.CLOSED;
        circuit.successCount = 0;
      }
    }
  }

  private onFailure(key: string) {
    const circuit = this.circuits.get(key);
    if (!circuit) return;

    circuit.failureCount++;
    circuit.successCount = 0;

    if (
      circuit.state === CircuitState.HALF_OPEN ||
      circuit.failureCount >= circuit.config.failureThreshold
    ) {
      this.logger.warn(
        `Circuit breaker ${key} moving to OPEN state after ${circuit.failureCount} failures`,
      );
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.config.resetTimeout;
      circuit.failureCount = 0;
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Circuit breaker timeout')), ms),
    );
  }

  getState(key: string): CircuitState | undefined {
    return this.circuits.get(key)?.state;
  }

  reset(key: string) {
    const circuit = this.circuits.get(key);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.nextAttempt = 0;
      this.logger.log(`Circuit breaker ${key} manually reset`);
    }
  }
}
