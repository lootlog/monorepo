import { Test, type TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Permission } from "prisma/generated/client";
import { RolesService } from "./roles.service";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";

describe("RolesService", () => {
  let service: RolesService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrismaService = {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    guild: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    deleteByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
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

    const allPermissionsExceptOwner = Object.values(Permission).filter(
      (p) => p !== Permission.OWNER,
    );

    it("should not include permissions in update when role exists and admin status unchanged", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: baseRoleData.id,
        permissions: [],
      });
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.update).not.toHaveProperty("permissions");
    });

    it("should include permissions in the create clause for non-admin role", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.create.permissions).toEqual([]);
    });

    it("should include all permissions except OWNER in the create clause for admin role", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: true });

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.create.permissions).toEqual(allPermissionsExceptOwner);
    });

    it("should preserve existing permissions when updating a non-admin role from Discord", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: baseRoleData.id,
        permissions: [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_LOOTS_READ],
      });
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({
        ...baseRoleData,
        name: "Renamed Role",
      });

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.update).toEqual({
        name: "Renamed Role",
        color: baseRoleData.color,
        position: baseRoleData.position,
      });
      expect(upsertCall.update.permissions).toBeUndefined();
    });

    it("should update permissions when role gains Discord admin", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: baseRoleData.id,
        permissions: [Permission.LOOTLOG_ACCESS],
      });
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: true });

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.update.permissions).toEqual(allPermissionsExceptOwner);
    });

    it("should reset permissions when role loses Discord admin", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: baseRoleData.id,
        permissions: allPermissionsExceptOwner,
      });
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: false });

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.update.permissions).toEqual([]);
    });

    it("should not update permissions when admin role stays admin", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: baseRoleData.id,
        permissions: [Permission.ADMIN, ...allPermissionsExceptOwner],
      });
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole({ ...baseRoleData, admin: true });

      const upsertCall = mockPrismaService.role.upsert.mock.calls[0][0];
      expect(upsertCall.update).not.toHaveProperty("permissions");
    });

    it("should invalidate permissions cache after upsert", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.upsert.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.createOrUpdateRole(baseRoleData);

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledTimes(1);
    });

    it("should log error and not clear cache when upsert fails", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.upsert.mockRejectedValue(new Error("DB error"));

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
      mockPrismaService.role.findUnique.mockResolvedValue(null);

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
      mockPrismaService.role.findUnique.mockResolvedValueOnce(existingRole);
      mockPrismaService.guild.findUnique.mockResolvedValue(guild);
      mockPrismaService.role.update.mockResolvedValue({
        ...existingRole,
        permissions: newPermissions,
      });
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.updateRolePermissions(discordId, guildId, roleId, {
        permissions: newPermissions,
        lvlRangeFrom: null,
        lvlRangeTo: null,
      });

      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          permissions: newPermissions,
          lvlRangeFrom: null,
          lvlRangeTo: null,
        },
      });
    });

    it("should throw ForbiddenException when non-owner changes admin permission", async () => {
      mockPrismaService.role.findUnique.mockResolvedValueOnce(existingRole);
      mockPrismaService.guild.findUnique.mockResolvedValue(guild);

      await expect(
        service.updateRolePermissions(discordId, guildId, roleId, {
          permissions: [Permission.ADMIN],
          lvlRangeFrom: null,
          lvlRangeTo: null,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow owner to change admin permission", async () => {
      mockPrismaService.role.findUnique.mockResolvedValueOnce(existingRole);
      mockPrismaService.guild.findUnique.mockResolvedValue(guild);
      mockPrismaService.role.update.mockResolvedValue({
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
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await service.deleteRole({ id: "role-1", guildId: "guild-1" });

      expect(mockPrismaService.role.delete).not.toHaveBeenCalled();
      expect(mockRedisService.deleteByPattern).not.toHaveBeenCalled();
    });

    it("should delete role and clear cache", async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: "role-1",
        guildId: "guild-1",
      });
      mockPrismaService.role.delete.mockResolvedValue({});
      mockRedisService.deleteByPattern.mockResolvedValue(undefined);

      await service.deleteRole({ id: "role-1", guildId: "guild-1" });

      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: "role-1" },
      });
      expect(mockRedisService.deleteByPattern).toHaveBeenCalled();
    });
  });

  describe("getRolesByGuildId", () => {
    it("should return roles ordered by position descending", async () => {
      const roles = [
        { id: "role-1", position: 2 },
        { id: "role-2", position: 1 },
      ];
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.getRolesByGuildId("guild-1");

      expect(result).toEqual(roles);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        orderBy: { position: "desc" },
      });
    });
  });
});
