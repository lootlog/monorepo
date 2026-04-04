import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { RedisService } from "@lootlog/nest-shared";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Permission } from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { MembersModule } from "src/members/members.module";
import { MembersService } from "src/members/members.service";
import { MemberContextModule } from "./member-context.module";
import { MemberContextService } from "./member-context.service";
import { Permissions } from "./permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

@Controller("guarded")
class GuardedPermissionsController {
  @Get()
  @Permissions(Permission.ADMIN)
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
        getGuildMemberById: jest.fn().mockResolvedValue(null),
      },
    },
    {
      provide: PrismaService,
      useValue: {
        guild: {
          findFirst: jest.fn(),
        },
      },
    },
    {
      provide: RedisService,
      useValue: {
        del: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
      },
    },
    {
      provide: WINSTON_MODULE_PROVIDER,
      useValue: mockLogger,
    },
  ],
})
class GuardedPermissionsTestModule {}

describe("PermissionsGuard bootstrap", () => {
  afterEach(() => {
    jest.clearAllMocks();
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
