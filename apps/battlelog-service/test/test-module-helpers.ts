import { RedisService } from "@lootlog/nest-shared/redis";
import type { ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from "nest-winston";
import { vi } from "vitest";
import { DeleteUserBattlesProcessor } from "#src/battles/delete-user-battles.processor";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
import { R2Service } from "#src/shared/modules/r2/r2.service";

function createMockLogger() {
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
    .overrideProvider(DrizzleService)
    .useValue({ db: {} })
    .overrideProvider(RedisService)
    .useValue({})
    .overrideProvider(R2Service)
    .useValue({})
    .overrideProvider(DeleteUserBattlesProcessor)
    .useValue({})
    .overrideProvider(WINSTON_MODULE_PROVIDER)
    .useValue(createMockLogger())
    .overrideProvider(WINSTON_MODULE_NEST_PROVIDER)
    .useValue(createMockLogger())
    .compile();
}
