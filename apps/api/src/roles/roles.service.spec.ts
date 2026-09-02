import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Permission } from "@lootlog/schema/permissions";
import { RolesService } from "./roles.service.js";
import { RolesRepository } from "./roles.repository.js";
import { RedisService } from "@lootlog/nest-shared/redis";

describe("RolesService", () => {
  let service: RolesService;

  const mockLogger = {
    log: mockFn(),
    error: mockFn(),
    warn: mockFn(),
  };

  const mockRepository = {
    findByGuildId: mockFn(),
    findById: mockFn(),
    findGuildOwnerId: mockFn(),
    bulkCreate: mockFn(),
    upsert: mockFn(),
    updatePermissions: mockFn(),
    deleteById: mockFn(),
    deleteByGuildId: mockFn(),
  };

  const mockRedisService = {
    deleteByPattern: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: mockRepository },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOrUpdateRole", () => {
    const baseRoleData = {
      id: "role-1",
      guildId: "guild-1",
      name: "Test Role",
      color: 0xff0000,
      position: 1,
      admin: false,
    };

    it("should not change permissions for existing non-admin role update", async () => {
      mockRepository.findById.mockResolvedValue({
        permissions: [Permission.LOOTLOG_ACCESS],
      });
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      const update = mockRepository.upsert.mock.calls[0][1];
      expect(update.permissions).toBeUndefined();
    });

    it("should not change permissions for existing admin role update when admin flag stays true", async () => {
      mockRepository.findById.mockResolvedValue({
        permissions: Object.values(Permission).filter(
          (p) => p !== Permission.OWNER,
        ),
      });
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({
        ...baseRoleData,
        admin: true,
        color: 0x00ff00,
      });

      const update = mockRepository.upsert.mock.calls[0][1];
      expect(update).toEqual({
        name: baseRoleData.name,
        color: 0x00ff00,
        position: baseRoleData.position,
      });
      expect(update.permissions).toBeUndefined();
    });

    it("should include permissions in the create clause for non-admin role", async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      const create = mockRepository.upsert.mock.calls[0][0];
      expect(create.permissions).toEqual([]);
    });

    it("should include all permissions except OWNER in the create clause for admin role", async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: true });

      const create = mockRepository.upsert.mock.calls[0][0];
      const expectedPermissions = Object.values(Permission).filter(
        (p) => p !== Permission.OWNER,
      );
      expect(create.permissions).toEqual(expectedPermissions);
    });

    it("should include all permissions except OWNER when role gains admin on Discord", async () => {
      mockRepository.findById.mockResolvedValue({
        permissions: [Permission.LOOTLOG_ACCESS],
      });
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: true });

      const update = mockRepository.upsert.mock.calls[0][1];
      const expectedPermissions = Object.values(Permission).filter(
        (p) => p !== Permission.OWNER,
      );
      expect(update.permissions).toEqual(expectedPermissions);
    });

    it("should update role fields and clear permissions when role loses admin on Discord", async () => {
      mockRepository.findById.mockResolvedValue({
        permissions: Object.values(Permission).filter(
          (p) => p !== Permission.OWNER,
        ),
      });
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({
        ...baseRoleData,
        name: "Renamed Role",
      });

      const update = mockRepository.upsert.mock.calls[0][1];
      expect(update).toEqual({
        name: "Renamed Role",
        color: baseRoleData.color,
        position: baseRoleData.position,
        permissions: [],
      });
    });

    it("should look up the existing role before deciding whether to sync permissions", async () => {
      mockRepository.findById.mockResolvedValue({
        permissions: [Permission.LOOTLOG_ACCESS],
      });
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      expect(mockRepository.findById).toHaveBeenCalledWith(
        baseRoleData.id,
        baseRoleData.guildId,
      );
    });

    it("should invalidate permissions cache after upsert", async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledTimes(1);
    });

    it("should log error and not clear cache when upsert fails", async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.upsert.mockRejectedValue(new Error("DB error"));

      await service.createOrUpdateRole(baseRoleData);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: "Failed to create or update role",
        }),
      );
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });
  });

  describe("updateRolePermissions", () => {
    const guildId = "guild-1";
    const roleId = "role-1";
    const discordId = "user-1";

    const existingRole = {
      id: roleId,
      guildId,
      name: "Test Role",
      permissions: [Permission.LOOTLOG_ACCESS],
    };

    const guild = {
      id: guildId,
      ownerId: "owner-1",
    };

    it("should throw NotFoundException when role does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateRolePermissions(discordId, guildId, roleId, {
          permissions: [Permission.LOOTLOG_ACCESS],
          lvlRangeFrom: null,
          lvlRangeTo: null,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update permissions successfully", async () => {
      const newPermissions = [
        Permission.LOOTLOG_ACCESS,
        Permission.LOOTLOG_LOOTS_READ,
      ];
      mockRepository.findById.mockResolvedValueOnce(existingRole);
      mockRepository.findGuildOwnerId.mockResolvedValue(guild.ownerId);
      mockRepository.updatePermissions.mockResolvedValue({
        ...existingRole,
        permissions: newPermissions,
      });
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.updateRolePermissions(discordId, guildId, roleId, {
        permissions: newPermissions,
        lvlRangeFrom: null,
        lvlRangeTo: null,
      });

      expect(mockRepository.updatePermissions).toHaveBeenCalledWith(
        roleId,
        guildId,
        newPermissions,
        null,
        null,
      );
    });

    it("should persist non-null level ranges unchanged", async () => {
      mockRepository.findById.mockResolvedValueOnce(existingRole);
      mockRepository.findGuildOwnerId.mockResolvedValue(guild.ownerId);
      mockRepository.updatePermissions.mockResolvedValue({
        ...existingRole,
        lvlRangeFrom: 51,
        lvlRangeTo: 300,
      });
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.updateRolePermissions(discordId, guildId, roleId, {
        permissions: [Permission.LOOTLOG_ACCESS],
        lvlRangeFrom: 51,
        lvlRangeTo: 300,
      });

      expect(mockRepository.updatePermissions).toHaveBeenCalledWith(
        roleId,
        guildId,
        [Permission.LOOTLOG_ACCESS],
        51,
        300,
      );
      expect(mockRedisService.deleteByPattern).toHaveBeenCalledTimes(1);
    });

    it("should throw ForbiddenException when non-owner changes admin permission", async () => {
      mockRepository.findById.mockResolvedValueOnce(existingRole);
      mockRepository.findGuildOwnerId.mockResolvedValue(guild.ownerId);

      await expect(
        service.updateRolePermissions(discordId, guildId, roleId, {
          permissions: [Permission.ADMIN],
          lvlRangeFrom: null,
          lvlRangeTo: null,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow owner to change admin permission", async () => {
      mockRepository.findById.mockResolvedValueOnce(existingRole);
      mockRepository.findGuildOwnerId.mockResolvedValue(guild.ownerId);
      mockRepository.updatePermissions.mockResolvedValue({
        ...existingRole,
        permissions: [Permission.ADMIN],
      });
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await expect(
        service.updateRolePermissions(guild.ownerId, guildId, roleId, {
          permissions: [Permission.ADMIN],
          lvlRangeFrom: null,
          lvlRangeTo: null,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("deleteRole", () => {
    it("should do nothing when role does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await service.deleteRole({ id: "role-1", guildId: "guild-1" });

      expect(mockRepository.deleteById).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should delete role and clear cache", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "role-1",
        guildId: "guild-1",
      });
      mockRepository.deleteById.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.deleteRole({ id: "role-1", guildId: "guild-1" });

      expect(mockRepository.deleteById).toHaveBeenCalledWith(
        "role-1",
        "guild-1",
      );
      expect(mockRedisService.deleteByPattern).toHaveBeenCalled();
    });
  });

  describe("getRolesByGuildId", () => {
    it("should return roles ordered by position descending", async () => {
      const roles = [
        { id: "role-1", position: 2 },
        { id: "role-2", position: 1 },
      ];
      mockRepository.findByGuildId.mockResolvedValue(roles);

      const result = await service.getRolesByGuildId("guild-1");

      expect(result).toEqual(roles);
      expect(mockRepository.findByGuildId).toHaveBeenCalledWith("guild-1");
    });
  });
});
