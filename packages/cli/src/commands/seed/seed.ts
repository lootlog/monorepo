import { PrismaClient } from "../../../../../apps/api/generated/client/index.js";
import { GuildGenerator } from "./generators/guild-generator.js";
import { LootGenerator } from "./generators/loot-generator.js";
import { generatePlayers } from "./generators/players-generator.js";
import { SEED_CONFIG } from "./config.js";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
const rootPath = path.join(__dirname, "../../../../../");
config({ path: path.join(rootPath, ".env") });

const prisma = new PrismaClient();

interface SeedOptions {
  guildsCount?: number;
  lootsCount?: number;
  playersCount?: number;
  clean?: boolean;
}

async function cleanDatabase() {
  console.log("🧹 Cleaning database...");

  await prisma.$transaction([
    prisma.lootComment.deleteMany(),
    prisma.lootSubmission.deleteMany(),
    prisma.loot.deleteMany(),
    prisma.timer.deleteMany(),
    prisma.member.deleteMany(),
    prisma.role.deleteMany(),
    prisma.guild.deleteMany(),
    prisma.userCharactersLootlogSettings.deleteMany(),
    prisma.userSettings.deleteMany(),
    prisma.lootlogConfigNpc.deleteMany(),
    prisma.lootlogConfig.deleteMany(),
    prisma.memberRefreshJob.deleteMany(),
  ]);

  console.log("✅ Database cleaned");
}

async function seedGuilds(count: number) {
  console.log(`🏰 Seeding ${count} guilds...`);

  const devGuildIdsRaw = process.env.DISCORD_DEVELOPMENT_GUILD_ID;
  const devUserId = process.env.DISCORD_DEVELOPMENT_USER_ID;

  const devGuildIds =
    devGuildIdsRaw && devGuildIdsRaw !== "xxx"
      ? devGuildIdsRaw
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

  const totalGuildsToCreate = Math.max(count, devGuildIds.length);

  const guildGenerator = new GuildGenerator();
  const guilds = guildGenerator.generateMultiple(totalGuildsToCreate);

  const createdGuilds = [];

  for (let i = 0; i < guilds.length; i++) {
    const guild = guilds[i];
    if (!guild) continue;

    const isDevGuild = i < devGuildIds.length;
    const useDevelopmentIds = isDevGuild && devUserId && devUserId !== "xxx";

    if (useDevelopmentIds) {
      const devGuildId = devGuildIds[i];
      if (!devGuildId) continue;

      // Check if dev guild already exists
      const existingGuild = await prisma.guild.findUnique({
        where: { id: devGuildId },
        include: {
          roles: true,
        },
      });

      if (existingGuild) {
        console.log(
          `⏭️  Skipping development guild ${devGuildId} (already exists)`,
        );
        createdGuilds.push(existingGuild);
        continue;
      }

      console.log(
        `📍 Using development guild ID: ${devGuildId} with owner: [REDACTED]`,
      );
      guild.id = devGuildId;
      guild.ownerId = devUserId;

      const ownerMember = guild.members.find((m) => m.userId === guild.ownerId);
      if (ownerMember) {
        ownerMember.userId = devUserId;
      }
    }

    const createdGuild = await prisma.guild.create({
      data: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        vanityUrl: guild.vanityUrl,
        active: guild.active,
        roles: {
          create: guild.roles.map((role) => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions,
            lvlRangeFrom: role.lvlRangeFrom,
            lvlRangeTo: role.lvlRangeTo,
          })),
        },
      },
      include: {
        roles: true,
      },
    });

    for (const member of guild.members) {
      await prisma.member.create({
        data: {
          userId: member.userId,
          guildId: createdGuild.id,
          name: member.name,
          avatar: member.avatar,
          active: member.active,
          roles: {
            connect: member.roleIds.map((roleId) => ({
              id_guildId: {
                id: roleId,
                guildId: createdGuild.id,
              },
            })),
          },
        },
      });
    }

    createdGuilds.push(createdGuild);
  }

  console.log(
    `✅ Created ${createdGuilds.length} guilds with roles and members`,
  );
  return createdGuilds;
}

async function seedLoots(count: number, guilds: any[]) {
  console.log(`🎁 Seeding ${count} loots...`);

  const dataPath = path.join(
    __dirname,
    "../../../../../apps/api/src/mocks/data",
  );
  const lootGenerator = new LootGenerator();

  try {
    await lootGenerator.initialize(dataPath);
  } catch (error) {
    console.error(
      "❌ Failed to initialize loot generator. Make sure data files exist.",
    );
    console.log("💡 Run scraping scripts first to generate data files.");
    return;
  }

  const loots = lootGenerator.generateMultiple(count);
  const createdLoots = [];

  const devGuildIdsRaw = process.env.DISCORD_DEVELOPMENT_GUILD_ID;
  const devUserId = process.env.DISCORD_DEVELOPMENT_USER_ID;

  const devGuildIds =
    devGuildIdsRaw && devGuildIdsRaw !== "xxx"
      ? devGuildIdsRaw
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

  for (const loot of loots) {
    const createdLoot = await prisma.loot.create({
      data: {
        uniqueId: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        items: loot.loots as any,
        world: loot.world,
        source: loot.source as any,
        location: loot.location,
        players: loot.players as any,
        npcs: loot.npcs as any,
        lootShare: {},
      },
    });

    if (guilds.length > 0) {
      const randomGuild = guilds[Math.floor(Math.random() * guilds.length)];
      let members = await prisma.member.findMany({
        where: { guildId: randomGuild.id },
        take: Math.floor(Math.random() * 3) + 1,
      });

      const isDevGuild = devGuildIds.includes(randomGuild.id);
      if (isDevGuild && devUserId && devUserId !== "xxx") {
        const devMember = await prisma.member.findFirst({
          where: {
            guildId: randomGuild.id,
            userId: devUserId,
          },
        });

        if (devMember && !members.some((m) => m.id === devMember.id)) {
          members = [devMember, ...members.slice(0, -1)];
        }
      }

      for (const member of members) {
        await prisma.lootSubmission.create({
          data: {
            lootId: createdLoot.id,
            guildId: randomGuild.id,
            memberId: member.id,
          },
        });
      }
    }

    createdLoots.push(createdLoot);
  }

  console.log(`✅ Created ${createdLoots.length} loots with submissions`);
  return createdLoots;
}

async function seedTimers(guilds: any[]) {
  console.log("⏱️  Seeding timers...");

  const dataPath = path.join(
    __dirname,
    "../../../../../apps/api/src/mocks/data",
  );
  const npcsPath = path.join(dataPath, "npcs.json");

  let npcs = [];
  try {
    const fs = await import("fs/promises");
    const npcsData = await fs.readFile(npcsPath, "utf-8");
    npcs = JSON.parse(npcsData);
  } catch (error) {
    console.error("❌ Failed to load NPCs data. Make sure npcs.json exists.");
    return;
  }

  const devGuildIdsRaw = process.env.DISCORD_DEVELOPMENT_GUILD_ID;
  const devUserId = process.env.DISCORD_DEVELOPMENT_USER_ID;

  const devGuildIds =
    devGuildIdsRaw && devGuildIdsRaw !== "xxx"
      ? devGuildIdsRaw
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

  let totalTimers = 0;

  for (const guild of guilds) {
    const members = await prisma.member.findMany({
      where: { guildId: guild.id },
    });

    if (members.length === 0) continue;

    const timerCount = SEED_CONFIG.timers.countPerGuild;

    const isDevGuild = devGuildIds.includes(guild.id);
    let devMember = null;
    if (isDevGuild && devUserId && devUserId !== "xxx") {
      devMember = await prisma.member.findFirst({
        where: {
          guildId: guild.id,
          userId: devUserId,
        },
      });
    }

    for (let i = 0; i < timerCount; i++) {
      const randomNpc = npcs[Math.floor(Math.random() * npcs.length)];
      const creatorMember =
        (isDevGuild && devMember) ||
        members[Math.floor(Math.random() * members.length)];

      if (!creatorMember || !randomNpc?.id) continue;

      const randomWorld = ["gordion", "classic", "katahha"][
        Math.floor(Math.random() * 3)
      ] as string;

      const now = new Date();
      const minSpawnTime = new Date(now.getTime() + Math.random() * 3600000);
      const maxSpawnTime = new Date(
        minSpawnTime.getTime() + Math.random() * 3600000,
      );

      try {
        await prisma.timer.create({
          data: {
            createdById: creatorMember.id,
            guildId: guild.id,
            npcId: randomNpc.id,
            world: randomWorld,
            minSpawnTime,
            maxSpawnTime,
            latestRespBaseSeconds: Math.floor(Math.random() * 7200),
            latestRespawnRandomness: Math.floor(Math.random() * 1800),
            npc: randomNpc,
          },
        });

        totalTimers++;
      } catch (error) {
        console.warn(`Failed to create timer for NPC ${randomNpc.id}`);
      }
    }
  }

  console.log(`✅ Created ${totalTimers} timers`);
}

export async function seed(options: SeedOptions = {}) {
  const {
    guildsCount = SEED_CONFIG.guilds.count,
    lootsCount = SEED_CONFIG.loots.count,
    clean = true,
  } = options;

  try {
    console.log("🌱 Starting database seeding...\n");

    if (clean) {
      await cleanDatabase();
      console.log();
    }

    const guilds = await seedGuilds(guildsCount);
    console.log();

    await seedLoots(lootsCount, guilds);
    console.log();

    await seedTimers(guilds);
    console.log();

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
