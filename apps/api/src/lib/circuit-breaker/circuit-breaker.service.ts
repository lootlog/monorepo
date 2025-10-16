import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import CircuitBreaker = require('opossum');

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly breakers = new Map<string, CircuitBreaker<any, any>>();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.logger.log({
      level: 'info',
      message: 'Circuit Breaker Service initialized',
    });
  }

  createBreaker<
    TArgs extends unknown[] = unknown[],
    TReturn = unknown,
    TFunction extends (...args: TArgs) => Promise<TReturn> = (
      ...args: TArgs
    ) => Promise<TReturn>,
  >(
    name: string,
    fn: TFunction,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker<TArgs, TReturn> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)! as CircuitBreaker<TArgs, TReturn>;
    }

    const breakerOptions = {
      timeout: options?.timeout || 15000,
      errorThresholdPercentage: options?.errorThresholdPercentage || 50,
      resetTimeout: options?.resetTimeout || 30000,
      rollingCountTimeout: options?.rollingCountTimeout || 10000,
      rollingCountBuckets: options?.rollingCountBuckets || 10,
      name: options?.name || name,
    };

    const breaker = new CircuitBreaker(fn, breakerOptions);

    breaker.on('open', () => {
      this.logger.log({
        level: 'error',
        message: `Circuit breaker opened: ${name}`,
      });
    });

    breaker.on('halfOpen', () => {
      this.logger.log({
        level: 'warn',
        message: `Circuit breaker half-open: ${name}`,
      });
    });

    breaker.on('close', () => {
      this.logger.log({
        level: 'info',
        message: `Circuit breaker closed: ${name}`,
      });
    });

    breaker.on('failure', (error) => {
      this.logger.log({
        level: 'debug',
        message: `Circuit breaker failure: ${name}`,
        error: error.message,
      });
    });

    breaker.on('success', () => {
      this.logger.log({
        level: 'debug',
        message: `Circuit breaker success: ${name}`,
      });
    });

    breaker.on('timeout', () => {
      this.logger.log({
        level: 'warn',
        message: `Circuit breaker timeout: ${name}`,
      });
    });

    breaker.on('reject', () => {
      this.logger.log({
        level: 'warn',
        message: `Circuit breaker rejected call: ${name}`,
      });
    });

    breaker.fallback((error) => {
      this.logger.log({
        level: 'error',
        message: `Circuit breaker fallback triggered for ${name}`,
        error,
      });
      throw error;
    });

    this.breakers.set(name, breaker);
    this.logger.log({
      level: 'info',
      message: `Circuit breaker created: ${name}`,
      options: breakerOptions,
    });

    return breaker;
  }

  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getBreakerStats(name: string): CircuitBreaker.Stats | undefined {
    const breaker = this.breakers.get(name);
    return breaker?.stats;
  }

  getAllBreakerStats(): Record<string, CircuitBreaker.Stats> {
    const stats: Record<string, CircuitBreaker.Stats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.stats;
    });
    return stats;
  }

  isOpen(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker?.opened || false;
  }

  isHalfOpen(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker?.halfOpen || false;
  }

  isClosed(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker?.closed || false;
  }
}
