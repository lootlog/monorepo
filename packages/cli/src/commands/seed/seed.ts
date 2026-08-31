import { all, and } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { db, postgresPool } from "../../../../../apps/api/src/prisma/db.js";
import { buildTimerKey } from "../../../../../apps/api/src/timers/utils/timer-key.js";
import {
  battles as battlesTable,
  battleWarriors,
} from "../../../../../apps/battlelog-service/src/shared/modules/drizzle/schema.js";
import { GuildGenerator } from "./generators/guild-generator.js";
import { LootGenerator } from "./generators/loot-generator.js";
import { BattlesGenerator } from "./generators/battles-generator.js";
import { BattleProcessor, type Warrior } from "@lootlog/battle-processor";
import { SEED_CONFIG } from "./config.js";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
const rootPath = path.join(__dirname, "../../../../../");
config({ path: path.join(rootPath, ".env") });

const prisma = db;

// Use separate connection string for battlelog if provided
const battlelogConnectionUri =
  process.env.BATTLELOG_DATABASE_URL || process.env.POSTGRESQL_CONNECTION_URI;

const battlelogPool = new Pool({ connectionString: battlelogConnectionUri });
const battlelogDb = drizzle({ client: battlelogPool });

interface SeedOptions {
  guildsCount?: number;
  lootsCount?: number;
  playersCount?: number;
  battlesCount?: number;
  clean?: boolean;
}

async function cleanDatabase() {
  console.log("🧹 Cleaning database...");

  await prisma.transaction(async (transaction) => {
    await transaction.orm.public.LootComment.where(all).deleteAndCount();
    await transaction.orm.public.LootSubmission.where(all).deleteAndCount();
    await transaction.orm.public.OrganizationLootRecord.where(
      all,
    ).deleteAndCount();
    await transaction.orm.public.LootItem.where(all).deleteAndCount();
    await transaction.orm.public.LootPlayer.where(all).deleteAndCount();
    await transaction.orm.public.LootNpc.where(all).deleteAndCount();
    await transaction.orm.public.Loot.where(all).deleteAndCount();
    await transaction.orm.public.Timer.where(all).deleteAndCount();
    await transaction.orm.public.MemberToRole.where(all).deleteAndCount();
    await transaction.orm.public.Member.where(all).deleteAndCount();
    await transaction.orm.public.Role.where(all).deleteAndCount();
    await transaction.orm.public.Guild.where(all).deleteAndCount();
    await transaction.orm.public.UserCharactersLootlogSettings.where(
      all,
    ).deleteAndCount();
    await transaction.orm.public.UserSettings.where(all).deleteAndCount();
    await transaction.orm.public.LootlogConfigNpc.where(all).deleteAndCount();
    await transaction.orm.public.LootlogConfig.where(all).deleteAndCount();
    await transaction.orm.public.MemberRefreshJob.where(all).deleteAndCount();
  });

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
      const existingGuild = await prisma.orm.public.Guild.where((row) =>
        row.id.eq(devGuildId),
      )
        .include("roles")
        .first();

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

    const createdGuild = await prisma.orm.public.Guild.create({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
      vanityUrl: guild.vanityUrl,
      active: guild.active,
      updatedAt: new Date(),
    });
    if (guild.roles.length > 0) {
      await prisma.orm.public.Role.createAndCount(
        guild.roles.map((role) => ({
          id: role.id,
          guildId: createdGuild.id,
          name: role.name,
          color: role.color,
          position: role.position,
          permissions: role.permissions,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          updatedAt: new Date(),
        })),
      );
    }

    for (const member of guild.members) {
      const createdMember = await prisma.orm.public.Member.create({
        userId: member.userId,
        guildId: createdGuild.id,
        name: member.name,
        avatar: member.avatar,
        active: member.active,
        updatedAt: new Date(),
      });
      if (member.roleIds.length > 0) {
        await prisma.orm.public.MemberToRole.createAndCount(
          member.roleIds.map((roleId) => ({
            a: createdMember.id,
            b: roleId,
          })),
        );
      }
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
    const createdLoot = await prisma.orm.public.Loot.create({
      uniqueId: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      world: loot.world,
      source: loot.source as any,
      location: loot.location,
      lootShare: loot.lootShare,
      updatedAt: new Date(),
    });

    if (guilds.length > 0) {
      const randomGuild = guilds[Math.floor(Math.random() * guilds.length)];
      let members = await prisma.orm.public.Member.where((row) =>
        row.guildId.eq(randomGuild.id),
      )
        .limit(Math.floor(Math.random() * 3) + 1)
        .all();

      const isDevGuild = devGuildIds.includes(randomGuild.id);
      if (isDevGuild && devUserId && devUserId !== "xxx") {
        const devMember = await prisma.orm.public.Member.where((row) =>
          and(row.guildId.eq(randomGuild.id), row.userId.eq(devUserId)),
        ).first();

        if (devMember && !members.some((m) => m.id === devMember.id)) {
          members = [devMember, ...members.slice(0, -1)];
        }
      }

      for (const member of members) {
        const organizationRecord =
          await prisma.orm.public.OrganizationLootRecord.where((row) =>
            and(row.lootId.eq(createdLoot.id), row.guildId.eq(randomGuild.id)),
          ).upsert({
            create: {
              lootId: createdLoot.id,
              guildId: randomGuild.id,
              updatedAt: new Date(),
            },
            update: {},
          });
        await prisma.orm.public.LootSubmission.where((row) =>
          and(
            row.organizationLootRecordId.eq(organizationRecord.id),
            row.memberId.eq(member.id),
          ),
        ).upsert({
          create: {
            organizationLootRecordId: organizationRecord.id,
            memberId: member.id,
            updatedAt: new Date(),
          },
          update: {},
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
    const members = await prisma.orm.public.Member.where((row) =>
      row.guildId.eq(guild.id),
    ).all();

    if (members.length === 0) continue;

    const timerCount = SEED_CONFIG.timers.countPerGuild;

    const isDevGuild = devGuildIds.includes(guild.id);
    let devMember = null;
    if (isDevGuild && devUserId && devUserId !== "xxx") {
      devMember = await prisma.orm.public.Member.where((row) =>
        and(row.guildId.eq(guild.id), row.userId.eq(devUserId)),
      ).first();
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
        await prisma.orm.public.Timer.create({
          createdById: creatorMember.id,
          guildId: guild.id,
          npcId: randomNpc.id,
          timerKey: buildTimerKey(randomNpc.id, randomNpc.name),
          world: randomWorld,
          minSpawnTime,
          maxSpawnTime,
          latestRespBaseSeconds: Math.floor(Math.random() * 7200),
          latestRespawnRandomness: Math.floor(Math.random() * 1800),
          npc: randomNpc,
          updatedAt: new Date(),
        });

        totalTimers++;
      } catch (error) {
        console.warn(`Failed to create timer for NPC ${randomNpc.id}`);
      }
    }
  }

  console.log(`✅ Created ${totalTimers} timers`);
}

const getSeedWarriorCore = (warrior: Warrior) => ({
  originalId: warrior.originalId.toString(),
  name: warrior.name,
  lvl: warrior.lvl,
  prof: warrior.prof,
  icon: warrior.icon,
  team: warrior.team,
  turns: warrior.turns,
  turnsLost: warrior.turnsLost ?? 0,
  steps: warrior.steps ?? 0,
  normalAttacks: warrior.normalAttacks ?? 0,
  spellsUsed: warrior.spellsUsed ?? 0,
  spellsUsedMap: warrior.spellsUsedMap ?? {},
  isDead: warrior.isDead,
  surrendered: warrior.surrendered ?? false,
  fled: warrior.fled ?? false,
  maxHp: warrior.maxHp ?? 0,
  damageDealt: warrior.damageDealt,
});

const getSeedWarriorDealtDamage = (warrior: Warrior) => ({
  distanceDamage: warrior.distanceDamage ?? 0,
  meleeDamage: warrior.meleeDamage ?? 0,
  auxiliaryDamage: warrior.auxiliaryDamage ?? 0,
  fireDamage: warrior.fireDamage ?? 0,
  frostDamage: warrior.frostDamage ?? 0,
  lightningDamage: warrior.lightningDamage ?? 0,
  thirdAttDamage: warrior.thirdAttDamage ?? 0,
  damageDealtAfterDefensive: warrior.damageDealtAfterDefensive ?? 0,
  damageDealtAfterDefensivePercentage:
    warrior.damageDealtAfterDefensivePercentage ?? 0,
});

const getSeedWarriorTakenDamage = (warrior: Warrior) => ({
  damageTaken: warrior.damageTaken,
  distanceDamageTaken: warrior.distanceDamageTaken ?? 0,
  meleeDamageTaken: warrior.meleeDamageTaken ?? 0,
  auxiliaryDamageTaken: warrior.auxiliaryDamageTaken ?? 0,
  fireDamageTaken: warrior.fireDamageTaken ?? 0,
  frostDamageTaken: warrior.frostDamageTaken ?? 0,
  lightningDamageTaken: warrior.lightningDamageTaken ?? 0,
  thirdAttDamageTaken: warrior.thirdAttDamageTaken ?? 0,
  flatDamageTaken: warrior.flatDamageTaken ?? 0,
});

const getSeedWarriorCombatEffects = (warrior: Warrior) => ({
  rageDamageDealt: warrior.rageDamageDealt ?? 0,
  trueDamageDealt: warrior.trueDamageDealt ?? 0,
  trueDamageTaken: warrior.trueDamageTaken ?? 0,
  stigmaDamageDealt: warrior.stigmaDamageDealt ?? 0,
  stigmaDamageTaken: warrior.stigmaDamageTaken ?? 0,
  passiveHealing: warrior.passiveHealing ?? 0,
  activeHealing: warrior.activeHealing ?? 0,
  armorPierces: warrior.armorPierces ?? 0,
  criticalHits: warrior.criticalHits ?? 0,
  reducedArmor: warrior.reducedArmor ?? 0,
  reducedPoisonResistance: warrior.reducedPoisonResistance ?? 0,
  magicResistanceDestroyed: warrior.magicResistanceDestroyed ?? 0,
});

const getSeedWarriorDefense = (warrior: Warrior) => ({
  evasions: warrior.evasions ?? 0,
  attacksEvaded: warrior.attacksEvaded ?? 0,
  counters: warrior.counters ?? 0,
  fastArrows: warrior.fastArrows ?? 0,
  blocks: warrior.blocks ?? 0,
  attacksBlocked: warrior.attacksBlocked ?? 0,
  blockedDamage: warrior.blockedDamage ?? 0,
});

const getSeedWarriorPersistentDamage = (warrior: Warrior) => ({
  woundDamageTaken: warrior.woundDamageTaken ?? 0,
  poisonDamageTaken: warrior.poisonDamageTaken ?? 0,
  injureDamageTaken: warrior.injureDamageTaken ?? 0,
  injures: warrior.injures ?? 0,
  critWoundDamageTaken: warrior.critWoundDamageTaken ?? 0,
  firePassiveDamageTaken: warrior.firePassiveDamageTaken ?? 0,
  lightningPassiveDamageTaken: warrior.lightningPassiveDamageTaken ?? 0,
});

const getSeedWarriorResources = (warrior: Warrior) => ({
  destroyedEnergy: warrior.destroyedEnergy ?? 0,
  destroyedMana: warrior.destroyedMana ?? 0,
  regeneratedEnergy: warrior.regeneratedEnergy ?? 0,
  regeneratedMana: warrior.regeneratedMana ?? 0,
  reflectedDamage: warrior.reflectedDamage ?? 0,
  reflectedDamageTaken: warrior.reflectedDamageTaken ?? 0,
});

const getSeedWarriorLegendaryEffects = (warrior: Warrior) => ({
  legbons: warrior.legbons ?? 0,
  legbonCurse: warrior.legbonCurse ?? 0,
  legbonCleanse: warrior.legbonCleanse ?? 0,
  legbonLastheal: warrior.legbonLastheal ?? 0,
  legbonLasthealValue: warrior.legbonLasthealValue ?? 0,
  legbonGlare: warrior.legbonGlare ?? 0,
  legbonHolytouch: warrior.legbonHolytouch ?? 0,
  legbonHolytouchValue: warrior.legbonHolytouchValue ?? 0,
  legbonCritredValue: warrior.legbonCritredValue ?? 0,
  legbonFacadeValue: warrior.legbonFacadeValue ?? 0,
  legbonVerycrit: warrior.legbonVerycrit ?? 0,
  legbonAnguish: warrior.legbonAnguish ?? 0,
  legbonPunctureValue: warrior.legbonPunctureValue ?? 0,
  legbonAnguishDamageTaken: warrior.legbonAnguishDamageTaken ?? 0,
  ph: warrior.ph ?? 0,
});

const toSeedBattleWarrior = (warrior: Warrior) => ({
  ...getSeedWarriorCore(warrior),
  ...getSeedWarriorDealtDamage(warrior),
  ...getSeedWarriorTakenDamage(warrior),
  ...getSeedWarriorCombatEffects(warrior),
  ...getSeedWarriorDefense(warrior),
  ...getSeedWarriorPersistentDamage(warrior),
  ...getSeedWarriorResources(warrior),
  ...getSeedWarriorLegendaryEffects(warrior),
});

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

      await battlelogDb.transaction(async (transaction) => {
        const battleId = createId();
        await transaction.insert(battlesTable).values({
          id: battleId,
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
          statistics: analysis.statistics,
        });
        await transaction.insert(battleWarriors).values(
          analysis.warriors.map((warrior) => ({
            id: createId(),
            battleId,
            ...toSeedBattleWarrior(warrior),
          })),
        );
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
    await postgresPool.end();
    await battlelogPool.end();
  }
}
