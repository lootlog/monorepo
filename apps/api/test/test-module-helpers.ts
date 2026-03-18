import { TestingModule, Test } from "@nestjs/testing";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { ModuleMetadata } from "@nestjs/common";

export function createMockAmqpConnection() {
  return {
    publish: jest.fn().mockResolvedValue(true),
    request: jest.fn().mockResolvedValue({}),
    createSubscriber: jest.fn(),
    channel: {
      assertQueue: jest.fn(),
      assertExchange: jest.fn(),
      bindQueue: jest.fn(),
    },
  };
}

export async function createTestingModuleWithMocks(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  const mockAmqpConnection = createMockAmqpConnection();

  console.info("Test config RABBITMQ_URI:", process.env.RABBITMQ_URI);
  console.info("Test config REDIS_HOST:", process.env.REDIS_HOST);
  console.info("Test config REDIS_PORT:", process.env.REDIS_PORT);

  return Test.createTestingModule(metadata)
    .overrideProvider(AmqpConnection)
    .useValue(mockAmqpConnection)
    .compile();
}
