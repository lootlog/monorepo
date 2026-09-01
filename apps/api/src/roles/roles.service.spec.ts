import { db as prismaDb } from "#src/prisma/db";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { mockFn } from "#src/test/mock-fn";
import { RolesService } from "./roles.service.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("RolesService", () => {
  const role = {
    where: mockFn(),
    select: mockFn(),
    orderBy: mockFn(),
    all: mockFn(),
    first: mockFn(),
    upsert: mockFn(),
    update: mockFn(),
    delete: mockFn(),
    deleteAll: mockFn(),
  };
  const guild = {
    where: mockFn(),
    select: mockFn(),
    first: mockFn(),
  };
  const db = {
    orm: { public: { Role: role, Guild: guild } },
    transaction: mockFn(),
  };
  const logger = { log: mockFn() };
  const redis = { deleteByPattern: mockFn() };
  let service: RolesService;

  beforeEach(() => {
    vi.clearAllMocks();
    role.where.mockReturnValue(role);
    role.select.mockReturnValue(role);
    role.orderBy.mockReturnValue(role);
    guild.where.mockReturnValue(guild);
    guild.select.mockReturnValue(guild);
    db.transaction.mockImplementation((operation) =>
      operation({ orm: db.orm }),
    );
    service = new RolesService(
      { db } as never,
      logger as never,
      redis as never,
    );
  });

  it("returns roles ordered by position", async () => {
    const roles = [
      { id: "role-1", position: 2, permissions: [] },
      { id: "role-2", position: 1, permissions: [] },
    ];
    role.all.mockResolvedValue(roles);

    await expect(service.getRolesByGuildId("guild-1")).resolves.toEqual(roles);
    expect(role.orderBy).toHaveBeenCalledOnce();
  });

  it("preserves permissions when Discord admin state is unchanged", async () => {
    role.first.mockResolvedValue(roleRow());
    role.upsert.mockResolvedValue(roleRow());

    await service.createOrUpdateRole(createRole());

    expect(role.upsert.mock.calls[0]?.[0]?.update).not.toHaveProperty(
      "permissions",
    );
    expect(redis.deleteByPattern).toHaveBeenCalledOnce();
  });

  it("synchronizes all non-owner permissions when a role becomes admin", async () => {
    role.first.mockResolvedValue(roleRow());
    role.upsert.mockResolvedValue(roleRow());

    await service.createOrUpdateRole(createRole({ admin: true }));

    expect(role.upsert.mock.calls[0]?.[0]?.update.permissions).toEqual(
      Object.values(Permission).filter(
        (permission) => permission !== Permission.OWNER,
      ),
    );
  });

  it("uses empty permissions when creating a non-admin role", async () => {
    role.first.mockResolvedValue(null);
    role.upsert.mockResolvedValue(roleRow({ permissions: [] }));

    await service.createOrUpdateRole(createRole());

    expect(role.upsert.mock.calls[0]?.[0]?.create.permissions).toEqual([]);
  });

  it("logs an upsert failure without invalidating the cache", async () => {
    role.first.mockResolvedValue(null);
    role.upsert.mockRejectedValue(new Error("DB error"));

    await service.createOrUpdateRole(createRole());

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to create or update role" }),
    );
    expect(redis.deleteByPattern).not.toHaveBeenCalled();
  });

  it("rejects permission updates for a missing role", async () => {
    role.first.mockResolvedValue(null);

    await expect(
      service.updateRolePermissions("user-1", "guild-1", "role-1", {
        permissions: [],
        lvlRangeFrom: null,
        lvlRangeTo: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("prevents a non-owner from changing administrative access", async () => {
    role.first.mockResolvedValue(roleRow());
    guild.first.mockResolvedValue({ ownerId: "owner-1" });

    await expect(
      service.updateRolePermissions("user-1", "guild-1", "role-1", {
        permissions: [Permission.ADMIN],
        lvlRangeFrom: null,
        lvlRangeTo: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows the owner to update administrative access", async () => {
    role.first.mockResolvedValue(roleRow());
    guild.first.mockResolvedValue({ ownerId: "owner-1" });
    role.update.mockResolvedValue(roleRow({ permissions: [Permission.ADMIN] }));

    await expect(
      service.updateRolePermissions("owner-1", "guild-1", "role-1", {
        permissions: [Permission.ADMIN],
        lvlRangeFrom: null,
        lvlRangeTo: null,
      }),
    ).resolves.toMatchObject({ permissions: [Permission.ADMIN] });
    expect(redis.deleteByPattern).toHaveBeenCalledOnce();
  });

  it("does not delete a role outside the guild", async () => {
    role.first.mockResolvedValue(null);

    await service.deleteRole({ id: "role-1", guildId: "guild-1" });

    expect(role.delete).not.toHaveBeenCalled();
    expect(redis.deleteByPattern).not.toHaveBeenCalled();
  });

  it("deletes an existing role and invalidates permissions", async () => {
    role.first.mockResolvedValue(roleRow());
    role.delete.mockResolvedValue(roleRow());

    await service.deleteRole({ id: "role-1", guildId: "guild-1" });

    expect(role.delete).toHaveBeenCalledOnce();
    expect(redis.deleteByPattern).toHaveBeenCalledOnce();
  });
});

const createRole = (overrides: Record<string, unknown> = {}) => ({
  id: "role-1",
  guildId: "guild-1",
  name: "Role",
  color: 123,
  position: 1,
  admin: false,
  ...overrides,
});

const roleRow = (overrides: Record<string, unknown> = {}) => ({
  id: "role-1",
  guildId: "guild-1",
  name: "Role",
  color: 123,
  position: 1,
  permissions: [Permission.LOOTLOG_ACCESS],
  createdAt: new Date(),
  updatedAt: new Date(),
  lvlRangeFrom: 0,
  lvlRangeTo: 500,
  ...overrides,
});
