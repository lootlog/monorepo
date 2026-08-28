import { PrismaClient } from "../../../../../apps/api/generated/client/index.js";
import { PrismaClient as BattlelogPrismaClient } from "../../../../../apps/battlelog-service/generated/client/index.js";
import { GuildGenerator } from "./generators/guild-generator.js";
import { LootGenerator } from "./generators/loot-generator.js";
import { BattlesGenerator } from "./generators/battles-generator.js";
import { BattleProcessor } from "@lootlog/battle-processor";
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

// Use separate connection string for battlelog if provided
const battlelogConnectionUri =
  process.env.BATTLELOG_DATABASE_URL || process.env.POSTGRESQL_CONNECTION_URI;

const battlelogPrisma = new BattlelogPrismaClient({
  datasources: {
    db: {
      url: battlelogConnectionUri,
    },
  },
});

interface SeedOptions {
  guildsCount?: number;
  lootsCount?: number;
  playersCount?: number;
  battlesCount?: number;
  clean?: boolean;
}

const valueOr = <T>(value: T | null | undefined, fallback: T): T =>
  value ?? fallback;

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

  const dataPath = path.join(__dirname, "../../mocks/data");
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
        lootShare: loot.lootShare,
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

  const dataPath = path.join(__dirname, "../../mocks/data");
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

async function seedBattles(count: number) {
  console.log(`⚔️  Seeding ${count} battles...`);

  const userId = process.env.SEEDING_USER_ID;
  if (!userId || userId === "xxx") {
    console.error(
      "❌ SEEDING_USER_ID environment variable is required for battles seeding",
    );
    return;
  }

  const battlesGenerator = new BattlesGenerator();
  await battlesGenerator.initialize();

  const accountId = `account-${Math.random().toString(36).substring(2, 11)}`;
  const characterId = `${Math.floor(Math.random() * 1000)}`;

  const battles = battlesGenerator.generateMultiple(
    count,
    characterId,
    accountId,
  );
  const processor = new BattleProcessor();

  let createdCount = 0;

  for (const battlePayload of battles) {
    try {
      const analysis = processor.processBattle(battlePayload as any);

      const totalPH = analysis.warriors.reduce(
        (sum, warrior) => sum + (warrior.ph || 0),
        0,
      );

      const battle = await battlelogPrisma.battle.create({
        data: {
          userId,
          accountId: battlePayload.accountId,
          characterId: battlePayload.characterId,
          world: battlePayload.world,
          duration: analysis.duration,
          type: analysis.type,
          winner: analysis.outcome.winner,
          loser: analysis.outcome.loser,
          winningTeam: analysis.outcome.winningTeam,
          losingTeam: analysis.outcome.losingTeam,
          honorPoints: totalPH,
          hasFlee: analysis.outcome.hasFlee,
          statistics: analysis.statistics as any,
          warriors: {
            create: analysis.warriors.map((warrior) => ({
              originalId: warrior.originalId.toString(),
              name: warrior.name,
              lvl: warrior.lvl,
              prof: warrior.prof,
              icon: warrior.icon,
              team: warrior.team,
              turns: warrior.turns,
              turnsLost: valueOr(warrior.turnsLost, 0),
              steps: valueOr(warrior.steps, 0),
              normalAttacks: valueOr(warrior.normalAttacks, 0),
              spellsUsed: valueOr(warrior.spellsUsed, 0),
              spellsUsedMap: valueOr(warrior.spellsUsedMap, {}),
              isDead: warrior.isDead,
              surrendered: valueOr(warrior.surrendered, false),
              fled: valueOr(warrior.fled, false),
              maxHp: valueOr(warrior.maxHp, 0),
              damageDealt: warrior.damageDealt,
              distanceDamage: valueOr(warrior.distanceDamage, 0),
              meleeDamage: valueOr(warrior.meleeDamage, 0),
              auxiliaryDamage: valueOr(warrior.auxiliaryDamage, 0),
              fireDamage: valueOr(warrior.fireDamage, 0),
              frostDamage: valueOr(warrior.frostDamage, 0),
              lightningDamage: valueOr(warrior.lightningDamage, 0),
              thirdAttDamage: valueOr(warrior.thirdAttDamage, 0),
              damageDealtAfterDefensive: valueOr(
                warrior.damageDealtAfterDefensive,
                0,
              ),
              damageDealtAfterDefensivePercentage: valueOr(
                warrior.damageDealtAfterDefensivePercentage,
                0,
              ),
              damageTaken: warrior.damageTaken,
              distanceDamageTaken: valueOr(warrior.distanceDamageTaken, 0),
              meleeDamageTaken: valueOr(warrior.meleeDamageTaken, 0),
              auxiliaryDamageTaken: valueOr(warrior.auxiliaryDamageTaken, 0),
              fireDamageTaken: valueOr(warrior.fireDamageTaken, 0),
              frostDamageTaken: valueOr(warrior.frostDamageTaken, 0),
              lightningDamageTaken: valueOr(warrior.lightningDamageTaken, 0),
              thirdAttDamageTaken: valueOr(warrior.thirdAttDamageTaken, 0),
              flatDamageTaken: valueOr(warrior.flatDamageTaken, 0),
              rageDamageDealt: valueOr(warrior.rageDamageDealt, 0),
              trueDamageDealt: valueOr(warrior.trueDamageDealt, 0),
              trueDamageTaken: valueOr(warrior.trueDamageTaken, 0),
              stigmaDamageDealt: valueOr(warrior.stigmaDamageDealt, 0),
              stigmaDamageTaken: valueOr(warrior.stigmaDamageTaken, 0),
              passiveHealing: valueOr(warrior.passiveHealing, 0),
              activeHealing: valueOr(warrior.activeHealing, 0),
              armorPierces: valueOr(warrior.armorPierces, 0),
              criticalHits: valueOr(warrior.criticalHits, 0),
              reducedArmor: valueOr(warrior.reducedArmor, 0),
              reducedPoisonResistance: valueOr(
                warrior.reducedPoisonResistance,
                0,
              ),
              magicResistanceDestroyed: valueOr(
                warrior.magicResistanceDestroyed,
                0,
              ),
              evasions: valueOr(warrior.evasions, 0),
              attacksEvaded: valueOr(warrior.attacksEvaded, 0),
              counters: valueOr(warrior.counters, 0),
              fastArrows: valueOr(warrior.fastArrows, 0),
              blocks: valueOr(warrior.blocks, 0),
              attacksBlocked: valueOr(warrior.attacksBlocked, 0),
              blockedDamage: valueOr(warrior.blockedDamage, 0),
              woundDamageTaken: valueOr(warrior.woundDamageTaken, 0),
              poisonDamageTaken: valueOr(warrior.poisonDamageTaken, 0),
              injureDamageTaken: valueOr(warrior.injureDamageTaken, 0),
              injures: valueOr(warrior.injures, 0),
              critWoundDamageTaken: valueOr(warrior.critWoundDamageTaken, 0),
              firePassiveDamageTaken: valueOr(
                warrior.firePassiveDamageTaken,
                0,
              ),
              lightningPassiveDamageTaken: valueOr(
                warrior.lightningPassiveDamageTaken,
                0,
              ),
              destroyedEnergy: valueOr(warrior.destroyedEnergy, 0),
              destroyedMana: valueOr(warrior.destroyedMana, 0),
              regeneratedEnergy: valueOr(warrior.regeneratedEnergy, 0),
              regeneratedMana: valueOr(warrior.regeneratedMana, 0),
              reflectedDamage: valueOr(warrior.reflectedDamage, 0),
              reflectedDamageTaken: valueOr(warrior.reflectedDamageTaken, 0),
              legbons: valueOr(warrior.legbons, 0),
              legbonCurse: valueOr(warrior.legbonCurse, 0),
              legbonCleanse: valueOr(warrior.legbonCleanse, 0),
              legbonLastheal: valueOr(warrior.legbonLastheal, 0),
              legbonLasthealValue: valueOr(warrior.legbonLasthealValue, 0),
              legbonGlare: valueOr(warrior.legbonGlare, 0),
              legbonHolytouch: valueOr(warrior.legbonHolytouch, 0),
              legbonHolytouchValue: valueOr(warrior.legbonHolytouchValue, 0),
              legbonCritredValue: valueOr(warrior.legbonCritredValue, 0),
              legbonFacadeValue: valueOr(warrior.legbonFacadeValue, 0),
              legbonVerycrit: valueOr(warrior.legbonVerycrit, 0),
              legbonAnguish: valueOr(warrior.legbonAnguish, 0),
              legbonPunctureValue: valueOr(warrior.legbonPunctureValue, 0),
              legbonAnguishDamageTaken: valueOr(
                warrior.legbonAnguishDamageTaken,
                0,
              ),
              ph: valueOr(warrior.ph, 0),
            })),
          },
        },
      });

      createdCount++;

      if (createdCount % 100 === 0) {
        console.log(`  Created ${createdCount}/${count} battles...`);
      }
    } catch (error) {
      console.warn(
        `Failed to create battle: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  console.log(`✅ Created ${createdCount} battles`);
}

export async function seed(options: SeedOptions = {}) {
  const {
    guildsCount = SEED_CONFIG.guilds.count,
    lootsCount = SEED_CONFIG.loots.count,
    battlesCount = SEED_CONFIG.battles.count,
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

    await seedBattles(battlesCount);
    console.log();

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await battlelogPrisma.$disconnect();
  }
}
