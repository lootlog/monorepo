import type { INestApplication } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../src/db/prisma.service.js";
import { db as prismaDb } from "../src/prisma/db.js";
import { RolesService } from "../src/roles/roles.service.js";
import { RoleResponseDto } from "../src/shared/dto/role-response.dto.js";
import { closeE2EApp, createE2EApp } from "./events-timers-e2e-helpers.js";
import { insertDatabaseFixture } from "./database-fixtures.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;

describe("Roles", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rolesService: RolesService;

  beforeAll(async () => {
    ({ app, prisma } = await createE2EApp());
    rolesService = app.get(RolesService);
  });

  beforeEach(async () => {
    await prisma.db
      .runtime()
      .execute(
        prisma.db.raw.sql`TRUNCATE TABLE "Guild", "Role" CASCADE`
          .affectedCount()
          .build(),
      );
    await insertDatabaseFixture(prisma, "Guild", {
      id: "roles-guild",
      name: "Roles guild",
      ownerId: "owner",
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await closeE2EApp(app, prisma);
  });

  it("returns PostgreSQL enum arrays in the HTTP response shape", async () => {
    await insertDatabaseFixture(prisma, "Role", {
      id: "role-1",
      guildId: "roles-guild",
      name: "Role",
      permissions: [Permission.LOOTLOG_ACCESS],
      updatedAt: new Date(),
    });

    const roles = await rolesService.getRolesByGuildId("roles-guild");

    expect(z.array(RoleResponseDto.schema).parse(roles)).toMatchObject([
      { permissions: [Permission.LOOTLOG_ACCESS] },
    ]);
  });

  it("creates and updates role permissions through the native ORM", async () => {
    await rolesService.createOrUpdateRole({
      id: "role-1",
      guildId: "roles-guild",
      name: "Role",
      color: 123,
      position: 1,
      admin: false,
    });
    await rolesService.createOrUpdateRole({
      id: "role-1",
      guildId: "roles-guild",
      name: "Admin role",
      color: 456,
      position: 2,
      admin: true,
    });

    const updated = await rolesService.updateRolePermissions(
      "owner",
      "roles-guild",
      "role-1",
      {
        permissions: [Permission.LOOTLOG_ACCESS],
        lvlRangeFrom: 100,
        lvlRangeTo: 200,
      },
    );

    expect(updated).toMatchObject({
      name: "Admin role",
      permissions: [Permission.LOOTLOG_ACCESS],
      lvlRangeFrom: 100,
      lvlRangeTo: 200,
    });
  });

  it("creates only missing roles in a bulk sync", async () => {
    const roles = [
      {
        id: "role-1",
        name: "Role 1",
        color: 123,
        position: 1,
        admin: false,
      },
      {
        id: "role-2",
        name: "Role 2",
        color: 456,
        position: 2,
        admin: true,
      },
    ];

    await expect(
      rolesService.bulkCreateRoles("roles-guild", roles),
    ).resolves.toEqual({ count: 2 });
    await expect(
      rolesService.bulkCreateRoles("roles-guild", roles),
    ).resolves.toEqual({ count: 0 });
  });
});
