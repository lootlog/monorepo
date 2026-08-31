import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { mockFn } from "#src/test/mock-fn";
import { Permission } from "#src/db/domain";
import { RolesService } from "./roles.service.js";

describe("RolesService", () => {
  const postgres = { query: mockFn(), connect: mockFn() };
  const logger = { log: mockFn() };
  const redis = { deleteByPattern: mockFn() };
  let service: RolesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RolesService(
      postgres as never,
      logger as never,
      redis as never,
    );
  });

  it("returns roles ordered by position", async () => {
    const roles = [
      { id: "role-1", position: 2 },
      { id: "role-2", position: 1 },
    ];
    postgres.query.mockResolvedValue({ rows: roles });

    await expect(service.getRolesByGuildId("guild-1")).resolves.toEqual(roles);
    expect(postgres.query.mock.calls[0]?.[1]).toEqual(["guild-1"]);
  });

  it("preserves permissions when Discord admin state is unchanged", async () => {
    postgres.query
      .mockResolvedValueOnce({
        rows: [{ permissions: [Permission.LOOTLOG_ACCESS] }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.createOrUpdateRole(createRole());

    expect(postgres.query.mock.calls[1]?.[1]?.[6]).toBe(false);
    expect(redis.deleteByPattern).toHaveBeenCalledOnce();
  });

  it("synchronizes all non-owner permissions when a role becomes admin", async () => {
    postgres.query
      .mockResolvedValueOnce({
        rows: [{ permissions: [Permission.LOOTLOG_ACCESS] }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.createOrUpdateRole(createRole({ admin: true }));

    const parameters = postgres.query.mock.calls[1]?.[1];
    expect(parameters?.[5]).toEqual(
      Object.values(Permission).filter(
        (permission) => permission !== Permission.OWNER,
      ),
    );
    expect(parameters?.[6]).toBe(true);
  });

  it("uses empty permissions when creating a non-admin role", async () => {
    postgres.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await service.createOrUpdateRole(createRole());

    expect(postgres.query.mock.calls[1]?.[1]?.[5]).toEqual([]);
  });

  it("logs an upsert failure without invalidating the cache", async () => {
    postgres.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error("DB error"));

    await service.createOrUpdateRole(createRole());

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to create or update role" }),
    );
    expect(redis.deleteByPattern).not.toHaveBeenCalled();
  });

  it("rejects permission updates for a missing role", async () => {
    postgres.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.updateRolePermissions("user-1", "guild-1", "role-1", {
        permissions: [],
        lvlRangeFrom: null,
        lvlRangeTo: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("prevents a non-owner from changing administrative access", async () => {
    postgres.query
      .mockResolvedValueOnce({ rows: [roleRow()] })
      .mockResolvedValueOnce({ rows: [{ ownerId: "owner-1" }] });

    await expect(
      service.updateRolePermissions("user-1", "guild-1", "role-1", {
        permissions: [Permission.ADMIN],
        lvlRangeFrom: null,
        lvlRangeTo: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows the owner to update administrative access", async () => {
    postgres.query
      .mockResolvedValueOnce({ rows: [roleRow()] })
      .mockResolvedValueOnce({ rows: [{ ownerId: "owner-1" }] })
      .mockResolvedValueOnce({
        rows: [roleRow({ permissions: [Permission.ADMIN] })],
      });

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
    postgres.query.mockResolvedValueOnce({ rows: [] });

    await service.deleteRole({ id: "role-1", guildId: "guild-1" });

    expect(postgres.query).toHaveBeenCalledOnce();
    expect(redis.deleteByPattern).not.toHaveBeenCalled();
  });

  it("deletes an existing role and invalidates permissions", async () => {
    postgres.query
      .mockResolvedValueOnce({ rows: [roleRow()] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await service.deleteRole({ id: "role-1", guildId: "guild-1" });

    expect(postgres.query).toHaveBeenCalledTimes(2);
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
