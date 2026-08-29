import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import { HttpService } from "@nestjs/axios";
import { Global, Module, type ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from "nest-winston";
import { of } from "rxjs";
import { vi } from "vitest";
import { gatewayRabbitMqModule } from "#src/gateway/gateway.module";

function createMockAmqpConnection() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue(undefined),
    createSubscriber: vi.fn(),
    managedConnection: {
      createChannel: vi.fn(),
    },
  };
}

function createMockHttpService() {
  return {
    get: vi.fn(() => of({ data: {} })),
    post: vi.fn(() => of({ data: {} })),
  };
}

function createMockLogger() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  };
}

const mockAmqpConnection = createMockAmqpConnection();

@Global()
@Module({
  providers: [{ provide: AmqpConnection, useValue: mockAmqpConnection }],
  exports: [AmqpConnection],
})
class MockRabbitMqModule {}

export function createTestingModuleWithMocks(metadata: ModuleMetadata) {
  return Test.createTestingModule(metadata)
    .overrideModule(gatewayRabbitMqModule)
    .useModule(MockRabbitMqModule)
    .overrideProvider(AmqpConnection)
    .useValue(mockAmqpConnection)
    .overrideProvider(RedisService)
    .useValue({})
    .overrideProvider(HttpService)
    .useValue(createMockHttpService())
    .overrideProvider(WINSTON_MODULE_PROVIDER)
    .useValue(createMockLogger())
    .overrideProvider(WINSTON_MODULE_NEST_PROVIDER)
    .useValue(createMockLogger())
    .compile();
}
