import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { HttpService } from "@nestjs/axios";
import { Test, type ModuleMetadata } from "@nestjs/testing";
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from "nest-winston";
import { of } from "rxjs";
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

export function createMockHttpService() {
  return {
    get: vi.fn(() => of({ data: {} })),
    post: vi.fn(() => of({ data: {} })),
    put: vi.fn(() => of({ data: {} })),
    patch: vi.fn(() => of({ data: {} })),
    delete: vi.fn(() => of({ data: {} })),
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
    .overrideProvider(HttpService)
    .useValue(createMockHttpService())
    .overrideProvider(WINSTON_MODULE_PROVIDER)
    .useValue(createMockLogger())
    .overrideProvider(WINSTON_MODULE_NEST_PROVIDER)
    .useValue(createMockLogger())
    .compile();
}
