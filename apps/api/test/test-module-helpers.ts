import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  APPLICATION_LOGGER,
  APPLICATION_NEST_LOGGER,
} from "#src/shared/logging/logger-token";
import { vi } from "vitest";

export function createMockAmqpConnection() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue(undefined),
    createSubscriber: vi.fn(),
    managedConnection: {
      createChannel: vi.fn(),
    },
  };
}

export function createMockLogger() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  };
}

export function createTestingModuleWithMocks(metadata: ModuleMetadata) {
  return Test.createTestingModule(metadata)
    .overrideProvider(AmqpConnection)
    .useValue(createMockAmqpConnection())
    .overrideProvider(APPLICATION_LOGGER)
    .useValue(createMockLogger())
    .overrideProvider(APPLICATION_NEST_LOGGER)
    .useValue(createMockLogger())
    .compile();
}
