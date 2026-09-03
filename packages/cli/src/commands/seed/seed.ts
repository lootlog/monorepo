import { buildTimerKey } from "../../../../../apps/api/src/timers/timer-key.js";
import {
  guildTable,
  itemSnapshotTable,
  lootCommentTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  memberRefreshJobTable,
  memberTable,
  memberToRoleTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
  roleTable,
  timerTable,
  userCharactersLootlogSettingsTable,
  userSettingsTable,
} from "../../../../../apps/api/src/database/drizzle/schema.js";
import {
  battles as battlesTable,
  battleWarriors as battleWarriorsTable,
} from "../../../../../apps/battlelog/src/database/schema.js";
import { GuildGenerator } from "./generators/guild-generator.js";
import { LootGenerator } from "./generators/loot-generator.js";
import { BattlesGenerator } from "./generators/battles-generator.js";
import { BattleProcessor, type Warrior } from "@lootlog/battle-processor";
import { SEED_CONFIG } from "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainPool = new pg.Pool({
  connectionString:
    process.env.POSTGRESQL_CONNECTION_URI ??
    "postgresql://placeholder:placeholder@localhost:5433/placeholder",
});
const mainDatabase = drizzle({ client: mainPool });

const ITEM_TYPES: Readonly<Record<number, string>> = {
  1: "ONE_HAND_WEAPON",
  2: "TWO_HAND_WEAPON",
  3: "ONE_AND_HALF_HAND_WEAPON",
  4: "DISTANCE_WEAPON",
  5: "HELP_WEAPON",
  6: "WAND_WEAPON",
  7: "ORB_WEAPON",
  8: "ARMOR",
  9: "HELMET",
  10: "BOOTS",
  11: "GLOVES",
  12: "RING",
  13: "NECKLACE",
  14: "SHIELD",
  15: "NEUTRAL",
  16: "CONSUME",
  17: "GOLD",
  18: "KEYS",
  19: "QUEST",
  20: "RENEWABLE",
  21: "ARROWS",
  22: "TALISMAN",
  23: "BOOK",
  24: "BAG",
  25: "BLESS",
  26: "UPGRADE",
  27: "RECIPE",
  28: "COINAGE",
  29: "QUIVER",
  30: "OUTFITS",
  31: "PETS",
  32: "TELEPORTS",
};

// Use separate connection string for battlelog if provided
const battlelogConnectionUri =
  process.env.BATTLELOG_DATABASE_URL || process.env.POSTGRESQL_CONNECTION_URI;

const battlelogPool = new pg.Pool({ connectionString: battlelogConnectionUri });
const battlelogDatabase = drizzle({ client: battlelogPool });

interface SeedOptions {
  guildsCount?: number;
  lootsCount?: number;
  playersCount?: number;
  battlesCount?: number;
  clean?: boolean;
}

async function cleanDatabase() {
  console.log("🧹 Cleaning database...");

  await mainDatabase.transaction(async (transaction) => {
    await transaction.delete(memberRefreshJobTable);
    await transaction.delete(lootCommentTable);
    await transaction.delete(lootSubmissionTable);
    await transaction.delete(lootItemTable);
    await transaction.delete(lootNpcTable);
    await transaction.delete(lootPlayerTable);
    await transaction.delete(organizationLootRecordTable);
    await transaction.delete(lootTable);
    await transaction.delete(itemSnapshotTable);
    await transaction.delete(npcSnapshotTable);
    await transaction.delete(timerTable);
    await transaction.delete(lootlogConfigNpcTable);
    await transaction.delete(lootlogConfigTable);
    await transaction.delete(memberToRoleTable);
    await transaction.delete(memberTable);
    await transaction.delete(roleTable);
    await transaction.delete(guildTable);
    await transaction.delete(userCharactersLootlogSettingsTable);
    await transaction.delete(userSettingsTable);
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
      const existingGuild = await mainDatabase
        .select()
        .from(guildTable)
        .where(eq(guildTable.id, devGuildId))
        .limit(1);

      if (existingGuild[0]) {
        console.log(
          `⏭️  Skipping development guild ${devGuildId} (already exists)`,
        );
        createdGuilds.push(existingGuild[0]);
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

    const createdGuild = await mainDatabase.transaction(async (transaction) => {
      const now = new Date();
      const insertedGuilds = await transaction
        .insert(guildTable)
        .values({
          id: guild.id,
          name: guild.name,
          icon: guild.icon ?? null,
          ownerId: guild.ownerId,
          vanityUrl: guild.vanityUrl ?? null,
          active: guild.active,
          updatedAt: now,
        })
        .returning();
      const insertedGuild = insertedGuilds[0];
      if (!insertedGuild) {
        throw new Error(`Guild insert did not return ${guild.id}`);
      }

      if (guild.roles.length > 0) {
        await transaction.insert(roleTable).values(
          guild.roles.map((role) => ({
            id: role.id,
            guildId: insertedGuild.id,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions,
            lvlRangeFrom: role.lvlRangeFrom,
            lvlRangeTo: role.lvlRangeTo,
            updatedAt: now,
          })),
        );
      }

      for (const member of guild.members) {
        const insertedMembers = await transaction
          .insert(memberTable)
          .values({
            userId: member.userId,
            guildId: insertedGuild.id,
            name: member.name,
            avatar: member.avatar ?? null,
            active: member.active,
            updatedAt: now,
          })
          .returning({ id: memberTable.id });
        const insertedMember = insertedMembers[0];
        if (!insertedMember || member.roleIds.length === 0) continue;
        await transaction.insert(memberToRoleTable).values(
          member.roleIds.map((roleId) => ({
            A: insertedMember.id,
            B: roleId,
          })),
        );
      }

      return insertedGuild;
    });

    createdGuilds.push(createdGuild);
  }

  console.log(
    `✅ Created ${createdGuilds.length} guilds with roles and members`,
  );
  return createdGuilds;
}

const SNAPSHOT_HASH_IGNORED_KEYS = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

const parseItemStats = (stats: string): Record<string, string> =>
  Object.fromEntries(
    stats
      .split(";")
      .map((entry) => entry.split("="))
      .filter((entry): entry is [string, string] =>
        Boolean(entry[0] && entry[1]),
      ),
  );

const createItemStatsHash = (stats: string): string => {
  const normalized = stats
    .split(";")
    .filter((entry) => {
      const [key] = entry.split("=");
      return Boolean(key) && !SNAPSHOT_HASH_IGNORED_KEYS.has(key ?? "");
    })
    .sort()
    .join(";");
  return createHash("sha256").update(normalized).digest("hex");
};

type MainTransaction = Parameters<
  Parameters<typeof mainDatabase.transaction>[0]
>[0];

async function findOrCreateItemSnapshot(
  transaction: MainTransaction,
  item: {
    id: number;
    name: string;
    icon: string;
    stat: string;
    cl: number;
    rarity: "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED";
  },
) {
  const statsHash = createItemStatsHash(item.stat);
  const parsedStats = parseItemStats(item.stat);
  const inserted = await transaction
    .insert(itemSnapshotTable)
    .values({
      itemId: item.id,
      statsHash,
      name: item.name,
      icon: item.icon,
      lvl: parsedStats["lvl"] ? Number(parsedStats["lvl"]) : 0,
      rarity: item.rarity,
      itemType: ITEM_TYPES[item.cl],
      statRaw: item.stat,
      statsSnapshot: parsedStats,
    })
    .onConflictDoNothing({
      target: [itemSnapshotTable.itemId, itemSnapshotTable.statsHash],
    })
    .returning({ id: itemSnapshotTable.id });
  if (inserted[0]) return inserted[0];

  const existing = await transaction
    .select({ id: itemSnapshotTable.id })
    .from(itemSnapshotTable)
    .where(
      and(
        eq(itemSnapshotTable.itemId, item.id),
        eq(itemSnapshotTable.statsHash, statsHash),
      ),
    )
    .limit(1);
  if (!existing[0]) throw new Error(`Missing item snapshot ${item.id}`);
  return existing[0];
}

async function findOrCreatePlayerSnapshot(
  transaction: MainTransaction,
  world: string,
  player: {
    name: string;
    prof: (typeof playerSnapshotTable.$inferInsert)["prof"];
    icon: string;
    characterId: string;
    accountId: string;
  },
) {
  const accountId = Number(player.accountId);
  const characterId = Number(player.characterId);
  const snapshotHash = createHash("sha256")
    .update(`${player.name}${player.prof}${player.icon}`)
    .digest("hex");
  const inserted = await transaction
    .insert(playerSnapshotTable)
    .values({
      world,
      accountId,
      characterId,
      snapshotHash,
      name: player.name,
      prof: player.prof,
      icon: player.icon,
    })
    .onConflictDoNothing({
      target: [
        playerSnapshotTable.world,
        playerSnapshotTable.accountId,
        playerSnapshotTable.characterId,
        playerSnapshotTable.snapshotHash,
      ],
    })
    .returning({ id: playerSnapshotTable.id });
  if (inserted[0]) return inserted[0];

  const existing = await transaction
    .select({ id: playerSnapshotTable.id })
    .from(playerSnapshotTable)
    .where(
      and(
        eq(playerSnapshotTable.world, world),
        eq(playerSnapshotTable.accountId, accountId),
        eq(playerSnapshotTable.characterId, characterId),
        eq(playerSnapshotTable.snapshotHash, snapshotHash),
      ),
    )
    .limit(1);
  if (!existing[0]) throw new Error(`Missing player snapshot ${player.name}`);
  return existing[0];
}

type SeedGuild = Awaited<ReturnType<typeof seedGuilds>>[number];

async function seedLoots(count: number, guilds: SeedGuild[]) {
  console.log(`🎁 Seeding ${count} loots...`);

  const dataPath = path.join(__dirname, "../../mocks/data");
  const lootGenerator = new LootGenerator();

  try {
    await lootGenerator.initialize(dataPath);
  } catch (_error) {
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
    const createdLoot = await mainDatabase.transaction(async (transaction) => {
      const insertedLoots = await transaction
        .insert(lootTable)
        .values({
          uniqueId: `loot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          world: loot.world,
          source: loot.source as "LOOTBOX" | "DIALOG" | "FIGHT",
          location: loot.location,
          lootShare: loot.lootShare,
          updatedAt: new Date(),
        })
        .returning();
      const insertedLoot = insertedLoots[0];
      if (!insertedLoot) throw new Error("Loot insert did not return a row");

      for (const item of loot.loots) {
        const snapshot = await findOrCreateItemSnapshot(transaction, item);
        await transaction.insert(lootItemTable).values({
          lootId: insertedLoot.id,
          itemSnapshotId: snapshot.id,
          hid: item.hid,
        });
      }

      for (const player of loot.players) {
        const snapshot = await findOrCreatePlayerSnapshot(
          transaction,
          loot.world,
          player,
        );
        await transaction.insert(lootPlayerTable).values({
          lootId: insertedLoot.id,
          playerSnapshotId: snapshot.id,
          lvl: player.lvl,
          hpp: player.hpp,
        });
      }

      for (const npc of loot.npcs) {
        const insertedSnapshots = await transaction
          .insert(npcSnapshotTable)
          .values({
            npcId: npc.id,
            name: npc.name,
            type: npc.type,
            lvl: npc.lvl,
            icon: npc.icon,
            wt: npc.wt,
            margonemType: npc.margonemType,
            prof: npc.prof,
          })
          .onConflictDoNothing({
            target: [npcSnapshotTable.npcId, npcSnapshotTable.name],
          })
          .returning({ id: npcSnapshotTable.id });
        const snapshot =
          insertedSnapshots[0] ??
          (
            await transaction
              .select({ id: npcSnapshotTable.id })
              .from(npcSnapshotTable)
              .where(
                and(
                  eq(npcSnapshotTable.npcId, npc.id),
                  eq(npcSnapshotTable.name, npc.name),
                ),
              )
              .limit(1)
          )[0];
        if (!snapshot) throw new Error(`Missing NPC snapshot ${npc.id}`);
        await transaction.insert(lootNpcTable).values({
          lootId: insertedLoot.id,
          npcSnapshotId: snapshot.id,
        });
      }

      return insertedLoot;
    });

    if (guilds.length > 0) {
      const randomGuild = guilds[Math.floor(Math.random() * guilds.length)];
      if (!randomGuild) continue;
      const organizationLootRecords = await mainDatabase
        .insert(organizationLootRecordTable)
        .values({
          lootId: createdLoot.id,
          guildId: randomGuild.id,
          updatedAt: new Date(),
        })
        .returning({ id: organizationLootRecordTable.id });
      const organizationLootRecord = organizationLootRecords[0];
      if (!organizationLootRecord) continue;
      let members = await mainDatabase
        .select()
        .from(memberTable)
        .where(eq(memberTable.guildId, randomGuild.id))
        .limit(Math.floor(Math.random() * 3) + 1);

      const isDevGuild = devGuildIds.includes(randomGuild.id);
      if (isDevGuild && devUserId && devUserId !== "xxx") {
        const devMembers = await mainDatabase
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.guildId, randomGuild.id),
              eq(memberTable.userId, devUserId),
            ),
          )
          .limit(1);
        const devMember = devMembers[0];

        if (devMember && !members.some((m) => m.id === devMember.id)) {
          members = [devMember, ...members.slice(0, -1)];
        }
      }

      for (const member of members) {
        await mainDatabase.insert(lootSubmissionTable).values({
          organizationLootRecordId: organizationLootRecord.id,
          memberId: member.id,
          updatedAt: new Date(),
        });
      }
    }

    createdLoots.push(createdLoot);
  }

  console.log(`✅ Created ${createdLoots.length} loots with submissions`);
  return createdLoots;
}

async function seedTimers(guilds: SeedGuild[]) {
  console.log("⏱️  Seeding timers...");

  const dataPath = path.join(__dirname, "../../mocks/data");
  const npcsPath = path.join(dataPath, "npcs.json");

  let npcs = [];
  try {
    const fs = await import("node:fs/promises");
    const npcsData = await fs.readFile(npcsPath, "utf-8");
    npcs = JSON.parse(npcsData);
  } catch (_error) {
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
    const members = await mainDatabase
      .select()
      .from(memberTable)
      .where(eq(memberTable.guildId, guild.id));

    if (members.length === 0) continue;

    const timerCount = SEED_CONFIG.timers.countPerGuild;

    const isDevGuild = devGuildIds.includes(guild.id);
    let devMember = null;
    if (isDevGuild && devUserId && devUserId !== "xxx") {
      const devMembers = await mainDatabase
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, guild.id),
            eq(memberTable.userId, devUserId),
          ),
        )
        .limit(1);
      devMember = devMembers[0] ?? null;
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
        await mainDatabase.insert(timerTable).values({
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
      } catch (_error) {
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

      const winningTeam = analysis.outcome.winningTeam;
      const losingTeam = analysis.outcome.losingTeam;
      if (
        winningTeam === undefined ||
        winningTeam === null ||
        losingTeam === undefined ||
        losingTeam === null
      ) {
        throw new Error("Battle analysis did not determine both teams");
      }

      await battlelogDatabase.transaction(async (transaction) => {
        const battleValues: typeof battlesTable.$inferInsert = {
          userId,
          accountId: battlePayload.accountId,
          characterId: battlePayload.characterId,
          world: battlePayload.world,
          duration: analysis.duration,
          type: analysis.type,
          winner: analysis.outcome.winner,
          loser: analysis.outcome.loser,
          winningTeam,
          losingTeam,
          honorPoints: totalPH,
          hasFlee: analysis.outcome.hasFlee,
          statistics: analysis.statistics,
        };
        const [battle] = await transaction
          .insert(battlesTable)
          .values(battleValues)
          .returning({ id: battlesTable.id });

        if (!battle) {
          throw new Error("Battle insert did not return an identifier");
        }

        await transaction.insert(battleWarriorsTable).values(
          analysis.warriors.map((warrior) => ({
            battleId: battle.id,
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
    await mainPool.end();
    await battlelogPool.end();
  }
}
