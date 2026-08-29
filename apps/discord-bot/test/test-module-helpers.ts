import { EventEmitter } from "node:events";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Global, Module, type ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Client } from "discord.js";
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from "nest-winston";
import { vi } from "vitest";
import { discordClientModule } from "#src/app.module";
import { botRabbitMqModule } from "#src/bot/bot.module";

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

function createMockDiscordClient() {
  return Object.assign(new EventEmitter(), {
    channels: { cache: new Map() },
    destroy: vi.fn(),
    guilds: { cache: new Map() },
    login: vi.fn().mockResolvedValue("test-discord-token"),
    rest: {},
    shard: undefined,
    token: "test-discord-token",
    users: { cache: new Map() },
    voice: undefined,
    ws: {},
  });
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
const mockDiscordClient = createMockDiscordClient();

@Global()
@Module({
  providers: [
    { provide: AmqpConnection, useValue: mockAmqpConnection },
    { provide: Client, useValue: mockDiscordClient },
  ],
  exports: [AmqpConnection, Client],
})
class MockExternalAdaptersModule {}

export function createTestingModuleWithMocks(metadata: ModuleMetadata) {
  return Test.createTestingModule(metadata)
    .overrideModule(botRabbitMqModule)
    .useModule(MockExternalAdaptersModule)
    .overrideModule(discordClientModule)
    .useModule(MockExternalAdaptersModule)
    .overrideProvider(AmqpConnection)
    .useValue(mockAmqpConnection)
    .overrideProvider(Client)
    .useValue(mockDiscordClient)
    .overrideProvider(WINSTON_MODULE_PROVIDER)
    .useValue(createMockLogger())
    .overrideProvider(WINSTON_MODULE_NEST_PROVIDER)
    .useValue(createMockLogger())
    .compile();
}
