import {
  PrismaClient,
  Loot,
  ItemRarity,
  Profession,
  NpcType,
  ItemType,
} from '../generated/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

// --- UTILS ---

const SNAPSHOT_HASH_IGNORED_KEYS = new Set(['created', 'gold', 'amount']);

const PROFESSIONS_SHORTNAMES: Record<string, Profession> = {
  BLADE_DANCER: Profession.BLADE_DANCER,
  HUNTER: Profession.HUNTER,
  MAGE: Profession.MAGE,
  PALADIN: Profession.PALADIN,
  TRACKER: Profession.TRACKER,
  WARRIOR: Profession.WARRIOR,
};

const getProfByShortname = (shortname: string): Profession => {
  return PROFESSIONS_SHORTNAMES[shortname];
};

const ITEM_TYPES: Record<number, ItemType> = {
  1: ItemType.ONE_HAND_WEAPON,
  2: ItemType.TWO_HAND_WEAPON,
  3: ItemType.ONE_AND_HALF_HAND_WEAPON,
  4: ItemType.DISTANCE_WEAPON,
  5: ItemType.HELP_WEAPON,
  6: ItemType.WAND_WEAPON,
  7: ItemType.ORB_WEAPON,
  8: ItemType.ARMOR,
  9: ItemType.HELMET,
  10: ItemType.BOOTS,
  11: ItemType.GLOVES,
  12: ItemType.RING,
  13: ItemType.NECKLACE,
  14: ItemType.SHIELD,
  15: ItemType.NEUTRAL,
  16: ItemType.CONSUME,
  17: ItemType.GOLD,
  18: ItemType.KEYS,
  19: ItemType.QUEST,
  20: ItemType.RENEWABLE,
  21: ItemType.ARROWS,
  22: ItemType.TALISMAN,
  23: ItemType.BOOK,
  24: ItemType.BAG,
  25: ItemType.BLESS,
  26: ItemType.UPGRADE,
  27: ItemType.RECIPE,
  28: ItemType.COINAGE,
  29: ItemType.QUIVER,
  30: ItemType.OUTFITS,
  31: ItemType.PETS,
  32: ItemType.TELEPORTS,
};

const getItemTypeByCl = (cl: number): ItemType | undefined => {
  return ITEM_TYPES[cl] ?? undefined;
};

const getNpcTypeByWt = (wt: number, prof?: string, type?: number): NpcType => {
  if (type === 0 && wt > 29 && wt < 80) {
    return NpcType.ELITE3;
  }

  if ((type === 5 || type === 0) && !prof) {
    return NpcType.NPC;
  }

  if (wt > 99) return NpcType.TITAN;
  else if (wt > 89) return NpcType.COLOSSUS;
  else if (wt > 79) return NpcType.HERO;
  else if (wt > 29) return NpcType.ELITE3;
  else if (wt > 19) return NpcType.ELITE2;
  else if (wt > 9) return NpcType.ELITE;

  return NpcType.COMMON;
};

const generateStatsHash = (stat: string): string => {
  // Sort stats to ensure consistent hashing regardless of key order
  // Filter out 'created' timestamp as it makes identical items unique
  const sortedStats = stat
    .split(';')
    .filter((statEntry) => {
      const [key] = statEntry.split('=');
      return Boolean(key) && !SNAPSHOT_HASH_IGNORED_KEYS.has(key);
    })
    .sort()
    .join(';');
  return createHash('sha256').update(sortedStats).digest('hex');
};

const generatePlayerSnapshotHash = (
  name: string,
  lvl: number,
  prof: string,
  icon: string,
): string => {
  const string = `${name}${lvl}${prof}${icon}`;
  return createHash('sha256').update(string).digest('hex');
};

const parseItemStats = (stats: string): Record<string, string> => {
  return stats.split(';').reduce(
    (acc, stat) => {
      const [key, value] = stat.split('=');
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
};

const getItemStats = (item: any) => {
  const parsedStats = parseItemStats(item.stat);
  const lvl = parsedStats['lvl'] ? Number(parsedStats['lvl']) : 0;
  const rarity = parsedStats['rarity']?.toUpperCase() as ItemRarity;
  const _requiredProf = parsedStats['reqp'] as string;

  // Check if 'type' field exists directly on item (legacy field)
  // If not, fallback to cl-based mapping
  let type = item.type as ItemType | undefined;

  // Normalize type if it comes as string but matches enum keys
  if (
    type &&
    typeof type === 'string' &&
    Object.keys(ItemType).includes(type)
  ) {
    type = type as ItemType;
  } else if (!type) {
    type = getItemTypeByCl(item.cl);
  }

  return { lvl, rarity, type, parsedStats };
};

const parseJsonField = (field: unknown): unknown => {
  return typeof field === 'string' ? JSON.parse(field) : field;
};

// --- MIGRATION LOGIC ---

const BATCH_SIZE = 5000;

async function migrate(db = prisma) {
  console.log('Starting Loot Migration...');

  const count = await db.loot.count({
    where: {
      OR: [
        { items: { not: null } },
        { players: { not: null } },
        { npcs: { not: null } },
      ],
    },
  });

  console.log(`Found ${count} loots to migrate.`);
  const startTime = Date.now();

  let processed = 0;
  let lastId = 0;

  while (true) {
    let loots: Loot[] = [];

    try {
      loots = await db.loot.findMany({
        where: {
          id: { gt: lastId },
          OR: [
            { items: { not: null } },
            { players: { not: null } },
            { npcs: { not: null } },
          ],
        },
        take: BATCH_SIZE,
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching batch, retrying in 5s...', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    if (loots.length === 0) {
      break;
    }

    const currentBatchLastId = loots[loots.length - 1].id;

    try {
      await processBatch(db, loots);

      processed += loots.length;
      lastId = currentBatchLastId; // Update lastId only on success

      const progress = (processed / count) * 100;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = processed / elapsed;
      const remaining = (count - processed) / speed;

      console.log(
        `Processed ${processed}/${count} (${progress.toFixed(
          2,
        )}%) - Speed: ${speed.toFixed(2)}/s - ETA: ${remaining.toFixed(0)}s`,
      );
    } catch (error) {
      console.error(
        `Error processing batch ending at ID ${currentBatchLastId}. Retrying in 5s...`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // We do NOT update lastId, so next loop will fetch the same batch again
    }
  }

  console.log('Migration finished.');
}

async function processBatch(db: PrismaClient, loots: Loot[]) {
  // Prepare data structures
  const itemSnapshotsToCreate = new Map<string, any>(); // key: itemId_statsHash
  const playerSnapshotsToCreate = new Map<string, any>(); // key: world_accountId_charId_hash
  const npcSnapshotsToCreate = new Map<string, any>(); // key: npcId_name

  // Temporary storage for what relations we need to create
  const lootItemsToCreate: {
    lootId: number;
    itemId: number;
    statsHash: string;
  }[] = [];
  const lootPlayersToCreate: {
    lootId: number;
    world: string;
    accountId: string;
    characterId: string;
    snapshotHash: string;
    hpp: number | null;
  }[] = [];
  const lootNpcsToCreate: { lootId: number; npcId: number; name: string }[] =
    [];
  const lootUpdates: {
    id: number;
    playerNames: string[];
    mainNpcName: string | null;
    mainNpcType: NpcType | null;
    itemRarities: ItemRarity[];
  }[] = [];

  for (const loot of loots) {
    let mainNpcName: string | null = null;
    let mainNpcType: NpcType | null = null;
    const playerNames: string[] = [];
    const itemRarities: Set<ItemRarity> = new Set();
    // 1. Items
    if (loot.items && loot.items !== null) {
      const items = parseJsonField(loot.items) as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item.stat) continue; // Skip invalid items
          const statsHash = generateStatsHash(item.stat);
          const key = `${item.id}_${statsHash}`;

          const { lvl, rarity, type, parsedStats } = getItemStats(item);

          if (!itemSnapshotsToCreate.has(key)) {
            if (!type) {
              console.warn(
                `[WARN] Unknown Item Type for Item ID ${item.id} (cl=${item.cl}). Stats: ${item.stat}`,
              );
            }

            itemSnapshotsToCreate.set(key, {
              itemId: item.id,
              statsHash,
              name: item.name,
              icon: item.icon,
              lvl,
              rarity,
              itemType: type ? String(type) : null,
              statRaw: item.stat,
              statsSnapshot: parsedStats,
            });
          }

          if (rarity) {
            itemRarities.add(rarity);
          }

          lootItemsToCreate.push({
            lootId: loot.id,
            itemId: item.id,
            statsHash,
          });
        }
      }
    }

    // 2. Players
    if (loot.players && loot.players !== null) {
      const players = parseJsonField(loot.players) as any[];
      if (Array.isArray(players)) {
        for (const player of players) {
          const prof = getProfByShortname(player.prof);
          playerNames.push(player.name);

          if (!prof) {
            console.warn(
              `[WARN] Unknown Profession for Player ID ${player.id} (prof=${player.prof}). Name: ${player.name}`,
            );
            console.log(player);
            return;
          }

          const snapshotHash = generatePlayerSnapshotHash(
            player.name,
            player.lvl,
            player.prof,
            player.icon,
          );
          const key = `${loot.world}_${player.accountId}_${player.id}_${snapshotHash}`;

          if (!playerSnapshotsToCreate.has(key)) {
            playerSnapshotsToCreate.set(key, {
              world: loot.world,
              accountId: String(player.accountId),
              characterId: String(player.id),
              snapshotHash,
              name: player.name,
              lvl: player.lvl,
              prof,
              icon: player.icon,
            });
          }

          lootPlayersToCreate.push({
            lootId: loot.id,
            world: loot.world,
            accountId: String(player.accountId),
            characterId: String(player.id),
            snapshotHash,
            hpp: player.hpp || null,
          });
        }
      }
      // Moved lootUpdates push to end of loop to include mainNpcName
    }

    // 3. Npcs
    if (loot.npcs && loot.npcs !== null) {
      const npcs = parseJsonField(loot.npcs) as any[];
      if (Array.isArray(npcs)) {
        // Sort npcs by wt descending to find main npc
        const sortedNpcs = [...npcs].sort((a, b) => (b.wt || 0) - (a.wt || 0));
        if (sortedNpcs.length > 0) {
          const mainNpc = sortedNpcs[0];
          mainNpcName = mainNpc.name;
          mainNpcType = getNpcTypeByWt(mainNpc.wt, mainNpc.prof, mainNpc.type);
        }

        for (const npc of npcs) {
          const key = `${npc.id}_${npc.name}`;

          if (!npcSnapshotsToCreate.has(key)) {
            const type = getNpcTypeByWt(npc.wt, npc.prof, npc.type);
            npcSnapshotsToCreate.set(key, {
              npcId: npc.id,
              name: npc.name,
              type,
              lvl: npc.lvl,
              icon: npc.icon ?? null,
            });
          }

          lootNpcsToCreate.push({
            lootId: loot.id,
            npcId: npc.id,
            name: npc.name,
          });
        }
      }
    }

    // Add update object if we have playerNames OR mainNpcName to update
    if (playerNames.length > 0 || mainNpcName || itemRarities.size > 0) {
      lootUpdates.push({
        id: loot.id,
        playerNames,
        mainNpcName,
        mainNpcType,
        itemRarities: Array.from(itemRarities),
      });
    }
  }

  // Bulk create Snapshots

  // --- Items ---
  if (itemSnapshotsToCreate.size > 0) {
    await db.itemSnapshot.createMany({
      data: Array.from(itemSnapshotsToCreate.values()),
      skipDuplicates: true,
    });

    const orConditions = Array.from(itemSnapshotsToCreate.values()).map(
      (i) => ({ itemId: i.itemId, statsHash: i.statsHash }),
    );

    const snapshotMap = new Map<string, number>(); // key -> id

    const CHUNK = 10;
    for (let i = 0; i < orConditions.length; i += CHUNK) {
      const batch = orConditions.slice(i, i + CHUNK);
      const found = await db.itemSnapshot.findMany({
        where: { OR: batch },
        select: { id: true, itemId: true, statsHash: true },
      });
      for (const f of found) {
        snapshotMap.set(`${f.itemId}_${f.statsHash}`, f.id);
      }
    }

    const finalLootItems = lootItemsToCreate
      .map((li) => {
        const sid = snapshotMap.get(`${li.itemId}_${li.statsHash}`);
        if (!sid) return null;
        return {
          lootId: li.lootId,
          itemSnapshotId: sid,
        };
      })
      .filter((x) => x !== null) as {
      lootId: number;
      itemSnapshotId: number;
    }[];

    if (finalLootItems.length > 0) {
      await db.lootItem.createMany({
        data: finalLootItems,
        skipDuplicates: true,
      });
    }
  }

  // --- Players ---
  if (playerSnapshotsToCreate.size > 0) {
    await db.playerSnapshot.createMany({
      data: Array.from(playerSnapshotsToCreate.values()),
      skipDuplicates: true,
    });

    const orConditions = Array.from(playerSnapshotsToCreate.values()).map(
      (p) => ({
        world: p.world,
        accountId: p.accountId,
        characterId: p.characterId,
        snapshotHash: p.snapshotHash,
      }),
    );

    const snapshotMap = new Map<string, number>();
    const CHUNK = 2000;
    for (let i = 0; i < orConditions.length; i += CHUNK) {
      const batch = orConditions.slice(i, i + CHUNK);
      const found = await db.playerSnapshot.findMany({
        where: { OR: batch },
        select: {
          id: true,
          world: true,
          accountId: true,
          characterId: true,
          snapshotHash: true,
        },
      });
      for (const f of found) {
        snapshotMap.set(
          `${f.world}_${f.accountId}_${f.characterId}_${f.snapshotHash}`,
          f.id,
        );
      }
    }

    const finalLootPlayers = lootPlayersToCreate
      .map((lp) => {
        const sid = snapshotMap.get(
          `${lp.world}_${lp.accountId}_${lp.characterId}_${lp.snapshotHash}`,
        );
        if (!sid) return null;
        return {
          lootId: lp.lootId,
          playerSnapshotId: sid,
          hpp: lp.hpp,
        };
      })
      .filter((x) => x !== null) as any[];

    if (finalLootPlayers.length > 0) {
      await db.lootPlayer.createMany({
        data: finalLootPlayers,
        skipDuplicates: true,
      });
    }
  }

  // --- Npcs ---
  if (npcSnapshotsToCreate.size > 0) {
    await db.npcSnapshot.createMany({
      data: Array.from(npcSnapshotsToCreate.values()),
      skipDuplicates: true,
    });

    const orConditions = Array.from(npcSnapshotsToCreate.values()).map((n) => ({
      npcId: n.npcId,
      name: n.name,
    }));

    const snapshotMap = new Map<string, number>();
    const CHUNK = 5000;
    for (let i = 0; i < orConditions.length; i += CHUNK) {
      const batch = orConditions.slice(i, i + CHUNK);
      const found = await db.npcSnapshot.findMany({
        where: { OR: batch },
        select: { id: true, npcId: true, name: true },
      });
      for (const f of found) {
        snapshotMap.set(`${f.npcId}_${f.name}`, f.id);
      }
    }

    const finalLootNpcs = lootNpcsToCreate
      .map((ln) => {
        const sid = snapshotMap.get(`${ln.npcId}_${ln.name}`);
        if (!sid) return null;
        return {
          lootId: ln.lootId,
          npcSnapshotId: sid,
        };
      })
      .filter((x) => x !== null) as any[];

    if (finalLootNpcs.length > 0) {
      await db.lootNpc.createMany({
        data: finalLootNpcs,
        skipDuplicates: true,
      });
    }
  }

  // Update playerNames and mainNpcName where needed
  if (lootUpdates.length > 0) {
    // Split updates into chunks to avoid connection pool exhaustion if there are many
    // Although with BATCH_SIZE=5000, parallel promises might be okay.
    // Let's just execute them.
    const updatePromises = lootUpdates.map((update) =>
      db.loot.update({
        where: { id: update.id },
        data: {
          playerNames: update.playerNames,
          mainNpcName: update.mainNpcName,
          mainNpcType: update.mainNpcType,
          itemRarities: update.itemRarities,
          // mainNpcId: null, // Removed because column was renamed/replaced in schema
        },
      }),
    );
    await Promise.all(updatePromises);
  }

  // Update Loots to clear legacy fields
  const lootIds = loots.map((l) => l.id);
  await db.loot.updateMany({
    where: { id: { in: lootIds } },
    data: {
      items: null,
      players: null,
      npcs: null,
    },
  });
}

if (require.main === module) {
  migrate()
    .catch((_error) => {
      // console.error(_error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { migrate, prisma };
