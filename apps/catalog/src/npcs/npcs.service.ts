import { uniqueWorlds } from "#src/shared/unique-worlds";
import { earliestSeenAt, toSeenAt } from "#src/shared/first-seen";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { GameVersion } from "@lootlog/schema/game-version";
import type { CatalogWriteFailure } from "#src/database/catalog-store";
import { Effect, Schema } from "effect";
import { groupBy, maxBy, partition } from "es-toolkit";
import { changedEntries } from "#src/shared/changed-entries";
import type { CatalogWrite } from "#src/items/items.service";
import type { AppLogger } from "#src/shared/logger";
import { getNpcType } from "@lootlog/domain/npc-type";
import type {
  CatalogMonsterFormerLevel,
  CatalogMonsterLocation,
  CatalogMonsterLocations,
  CatalogNpcObservation,
} from "@lootlog/protocol/rabbit/catalog";

export type IndexNpcsCommand = {
  readonly npcs: ReadonlyArray<CatalogNpcObservation>;
};

export type MonsterLocationsCommand = {
  readonly monsters: ReadonlyArray<CatalogMonsterLocations>;
};

type IndexNpc = CatalogNpcObservation;

// One catalog entry per edition, identity namespace, id and Margonem type:
// every world of an edition uses the same NPC ids. Legacy keys omit the
// namespace; equal ids in another namespace or edition are a different NPC.
export const npcCatalogKey = (npc: {
  id: number;
  identityNamespace: NpcIdentityNamespace;
  margonemType: number;
  gameVersion: GameVersion;
}) => {
  const key = `${npc.id}_${npc.margonemType}`;

  const namespaced =
    npc.identityNamespace === NpcIdentityNamespace.LEGACY
      ? key
      : `${npc.identityNamespace}_${key}`;

  return `${npc.gameVersion}_${namespaced}`;
};

// A template id selects every spawn of the monster; prefer it when name and
// type collapse several catalog identities into one suggestion.
const NAMESPACE_PREFERENCE: Record<NpcIdentityNamespace, number> = {
  [NpcIdentityNamespace.TEMPLATE]: 0,
  [NpcIdentityNamespace.LEGACY]: 1,
  [NpcIdentityNamespace.RUNTIME]: 2,
};

/**
 * One monster across its catalog identities: a boss seen by older clients
 * keeps runtime or legacy entries beside its template one, all with the
 * edition, name and type in common. Equal names in different editions are
 * different monsters.
 */
export const npcMonsterKey = (npc: {
  gameVersion: GameVersion;
  name: string;
  type: string | null;
}) => `${npc.gameVersion}_${npc.name}_${npc.type}`;

/** Lower ranks first: the monster as it is now, then the preferred namespace. */
const identityRank = (hit: {
  identityNamespace: NpcIdentityNamespace;
  current?: boolean;
}) =>
  (hit.current === false ? Object.keys(NAMESPACE_PREFERENCE).length : 0) +
  NAMESPACE_PREFERENCE[hit.identityNamespace];

export const collapseByNameAndType = <
  Hit extends {
    gameVersion: GameVersion;
    name: string;
    type: string | null;
    identityNamespace: NpcIdentityNamespace;
    current?: boolean;
  },
>(
  hits: readonly Hit[],
) => {
  const preferred = new Map<string, Hit>();

  for (const hit of hits) {
    const key = npcMonsterKey(hit);
    const chosen = preferred.get(key);

    if (!chosen || identityRank(hit) < identityRank(chosen)) {
      preferred.set(key, hit);
    }
  }

  // Keep the relevance position of each suggestion's first hit.
  return [...preferred.values()];
};

/**
 * The stored shape of one NPC catalog entry; the seed script and the consumer
 * share it. `worlds` holds every world the entry was observed in, and
 * `observedLootId` orders observations.
 */
export const toNpcDocument = (npc: IndexNpc) => {
  const prof = npc.prof ?? "";

  const type = Schema.is(NpcTypeSchema)(npc.type)
    ? npc.type
    : getNpcType(NpcTypeEnum, {
        wt: npc.wt,
        prof,
        type: npc.margonemType,
        icon: npc.icon,
      });

  return {
    id: npc.id,
    identityNamespace: npc.identityNamespace,
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    prof,
    type,
    margonemType: npc.margonemType,
    worlds: [npc.world],
    gameVersion: npc.gameVersion,
    uid: npcCatalogKey(npc),
    monsterKey: npcMonsterKey({ ...npc, type }),
    observedLootId: npc.lootId,
    firstSeenAt: toSeenAt(npc.observedAt),
  };
};

/**
 * A stored catalog entry. `locations` comes from the API's daily monster
 * statistics, not from loots; entries it has not reached yet have none.
 */
export type NpcEntry = ReturnType<typeof toNpcDocument> & {
  locations?: ReadonlyArray<typeof CatalogMonsterLocation.Type>;
  formerLevels?: ReadonlyArray<typeof CatalogMonsterFormerLevel.Type>;
  current?: boolean;
};

/**
 * Whether each catalog identity of a monster shows it as the game has it
 * now. The identity with the latest loot holds the current level; an identity
 * still at another one, such as an older client's entry from before the
 * monster was rebalanced, is its history. The catalog lists only current
 * identities, so a monster is found at its level now and not its highest one.
 */
export const currentRevisions = (
  documents: ReadonlyArray<
    Pick<NpcEntry, "uid" | "monsterKey" | "lvl" | "observedLootId">
  >,
) =>
  Object.values(groupBy(documents, ({ monsterKey }) => monsterKey)).flatMap(
    (identities) => {
      const latest = maxBy(identities, ({ observedLootId }) => observedLootId);

      return identities.map(({ uid, lvl }) => ({
        uid,
        current: lvl === latest?.lvl,
      }));
    },
  );

/** Whether `stored` comes from a later loot than `incoming`. */
const isNewerObservation = (
  stored: Pick<NpcEntry, "observedLootId">,
  incoming: Pick<NpcEntry, "observedLootId">,
) => stored.observedLootId > incoming.observedLootId;

/**
 * One catalog entry from two observations: the later loot's attributes,
 * every world of both, the earlier first sighting and the stored locations.
 * Delivery order is not chronology: a retried or redelivered publication can
 * arrive after a newer one.
 */
export const mergeNpcDocument = (
  incoming: NpcEntry,
  stored: NpcEntry,
): NpcEntry => {
  const locations = stored.locations ?? incoming.locations;
  const formerLevels = stored.formerLevels ?? incoming.formerLevels;

  return {
    ...(isNewerObservation(stored, incoming) ? stored : incoming),
    worlds: uniqueWorlds([...incoming.worlds, ...stored.worlds]),
    // Entries indexed before first sightings were recorded have none.
    firstSeenAt: earliestSeenAt(incoming.firstSeenAt, stored.firstSeenAt),
    ...(locations && { locations }),
    ...(formerLevels && { formerLevels }),
  };
};

/** Documents of one catalog entry in one batch merge into one. */
export const mergeNpcDocuments = (
  documents: ReadonlyArray<NpcEntry>,
): NpcEntry[] => {
  const byUid = new Map<string, NpcEntry>();

  for (const document of documents) {
    const existing = byUid.get(document.uid);

    byUid.set(
      document.uid,
      existing ? mergeNpcDocument(document, existing) : document,
    );
  }

  return [...byUid.values()];
};

export const makeNpcsModule = (write: CatalogWrite, logger: AppLogger) => {
  const indexNpcs = Effect.fn("CatalogNpcs.index")(function* (
    data: IndexNpcsCommand,
  ) {
    const [validNpcs, invalidNpcs] = partition(data.npcs, (npc) =>
      Boolean(npc.world && npc.id && npc.name),
    );

    if (validNpcs.length === 0) {
      logger.warn("No valid npcs to index (missing required fields)", {
        npcs: data.npcs,
      });

      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      logger.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields`,
        { invalidNpcs },
      );
    }

    const documents = mergeNpcDocuments(validNpcs.map(toNpcDocument));
    const incomingUids = new Set(documents.map(({ uid }) => uid));

    yield* write((change) =>
      Effect.gen(function* () {
        const storedEntries = yield* change.npcsByUids([...incomingUids]);

        const storedByUid = new Map(
          storedEntries.map((entry) => [entry.uid, entry]),
        );

        const identities = yield* change.npcsByMonsterKeys([
          ...new Set(documents.map(({ monsterKey }) => monsterKey)),
        ]);

        // Every identity of these monsters as it is once the batch merges in.
        const current = new Map(
          currentRevisions([
            ...identities.filter(({ uid }) => !incomingUids.has(uid)),
            ...documents.map((document) => {
              const stored = storedByUid.get(document.uid);

              return stored && isNewerObservation(stored, document)
                ? { ...document, ...stored }
                : document;
            }),
          ]).map((revision) => [revision.uid, revision.current]),
        );

        const changed = yield* changedEntries(
          "npcs",
          documents,
          storedEntries,
          (npc, stored) => ({
            ...(stored ? mergeNpcDocument(npc, stored) : npc),
            current: current.get(npc.uid) ?? true,
          }),
        );

        // The monster's other identities, when this batch changed which is current.
        const superseded = identities.flatMap((identity) =>
          !incomingUids.has(identity.uid) &&
          current.get(identity.uid) !== identity.current
            ? [{ ...identity, current: current.get(identity.uid) ?? true }]
            : [],
        );

        if (changed.length + superseded.length > 0) {
          yield* change.saveNpcs([...changed, ...superseded]);
        }
      }),
    );
  });

  /**
   * Replaces each monster's locations and former levels on every catalog
   * identity of it. Only those fields
   * are written, so observations indexed meanwhile are kept.
   */
  const setLocations = Effect.fn("CatalogNpcs.setLocations")(function* (
    data: MonsterLocationsCommand,
  ) {
    const monsters = new Map(
      data.monsters.map((monster) => [npcMonsterKey(monster), monster]),
    );

    yield* write((change) =>
      Effect.gen(function* () {
        const documents = yield* change.npcsByMonsterKeys([...monsters.keys()]);

        const changed = documents.flatMap((document) => {
          const monster = monsters.get(document.monsterKey);

          if (!monster) return [];

          return Bun.deepEquals(monster.locations, document.locations) &&
            Bun.deepEquals(monster.formerLevels, document.formerLevels)
            ? []
            : [
                {
                  ...document,
                  locations: monster.locations,
                  formerLevels: monster.formerLevels,
                },
              ];
        });

        if (changed.length > 0) yield* change.saveNpcs(changed);
      }),
    );
  });

  return { indexNpcs, setLocations } satisfies {
    readonly indexNpcs: (
      data: IndexNpcsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly setLocations: (
      data: MonsterLocationsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
  };
};
