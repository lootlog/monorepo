import { db as prismaDb } from "#src/prisma/db";
import { PERMISSIONS_KEY } from "#src/shared/permissions/permissions.decorator";
import { NotificationsGuildController } from "./notifications-guild.controller.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("NotificationsGuildController", () => {
  const mockTargetService = {
    listGuildTargets: vi.fn(),
    createGuildTarget: vi.fn(),
    updateGuildTarget: vi.fn(),
    deleteGuildTarget: vi.fn(),
  };
  const mockRuleService = {
    listGuildRules: vi.fn(),
    createGuildRule: vi.fn(),
    updateGuildRule: vi.fn(),
    deleteGuildRule: vi.fn(),
    rebuildGuildRuleJobs: vi.fn(),
    triggerGuildRuleTest: vi.fn(),
  };
  const mockJobService = {
    listGuildJobs: vi.fn(),
    cancelGuildJob: vi.fn(),
  };
  const mockChannelsService = {
    getSelectableGuildChannels: vi.fn(),
  };

  let controller: NotificationsGuildController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new NotificationsGuildController(
      mockTargetService as never,
      mockRuleService as never,
      mockJobService as never,
      mockChannelsService as never,
    );
  });

  it("declares owner/admin permissions at controller level", () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, NotificationsGuildController),
    ).toEqual([Permission.OWNER, Permission.ADMIN]);
  });

  it("delegates target and rule actions with the guild id", () => {
    controller.getGuildTargets({ id: "guild-1" } as never);
    controller.createGuildRule(
      { id: "guild-1" } as never,
      { name: "Rule" } as never,
    );
    controller.cancelGuildJob({ id: "guild-1" } as never, "job-1");

    expect(mockTargetService.listGuildTargets).toHaveBeenCalledWith("guild-1");
    expect(mockRuleService.createGuildRule).toHaveBeenCalledWith("guild-1", {
      name: "Rule",
    });
    expect(mockJobService.cancelGuildJob).toHaveBeenCalledWith(
      "guild-1",
      "job-1",
    );
  });
});
