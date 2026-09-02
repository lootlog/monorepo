import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { mockFn } from "#src/test/mock-fn";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { RedisService } from "@lootlog/nest-shared/redis";
import { RequiresCapabilities } from "@lootlog/nest-shared";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { Permission } from "@lootlog/schema/permissions";
import { MembersModule } from "#src/members/members.module";
import { MembersService } from "#src/members/members.service";
import { MemberContextModule } from "./member-context.module.js";
import { MemberContextService } from "./member-context.service.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { MemberContextRepository } from "./member-context.repository.js";

const mockLogger = {
  debug: mockFn(),
  error: mockFn(),
  log: mockFn(),
  warn: mockFn(),
};

@Controller("guarded")
class GuardedPermissionsController {
  @Get()
  @RequiresCapabilities(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  read() {
    return true;
  }
}

@Module({
  controllers: [GuardedPermissionsController],
  providers: [
    PermissionsGuard,
    MemberContextService,
    {
      provide: MembersService,
      useValue: {
        getGuildMemberById: mockFn().mockResolvedValue(null),
      },
    },
    {
      provide: MemberContextRepository,
      useValue: {
        findActiveGuild: mockFn(),
      },
    },
    {
      provide: RedisService,
      useValue: {
        del: mockFn(),
        get: mockFn(),
        set: mockFn(),
      },
    },
    {
      provide: APPLICATION_LOGGER,
      useValue: mockLogger,
    },
  ],
})
class GuardedPermissionsTestModule {}

describe("PermissionsGuard bootstrap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps MembersModule independent from MemberContextModule", () => {
    const rawImports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, MembersModule) ?? [];

    const imports = rawImports.map((imported: unknown) => {
      if (
        imported &&
        typeof imported === "object" &&
        "forwardRef" in imported &&
        typeof imported.forwardRef === "function"
      ) {
        return imported.forwardRef();
      }

      return imported;
    });

    expect(imports).not.toContain(MemberContextModule);
  });

  it("compiles a guarded module using PermissionsGuard", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GuardedPermissionsTestModule],
    }).compile();

    expect(moduleRef.get(PermissionsGuard)).toBeDefined();
    expect(moduleRef.get(MemberContextService)).toBeDefined();

    await moduleRef.close();
  });
});
