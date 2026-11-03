import { uniqueWorlds } from "#src/shared/unique-worlds";
import { earliestSeenAt, toSeenAt } from "#src/shared/first-seen";
import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { GameVersion } from "@lootlog/schema/game-version";
import { Effect, Schema } from "effect";
import { chunk, groupBy, maxBy, partition, pick } from "es-toolkit";
import type { Index, Meilisearch } from "meilisearch";
import {
  buildMeilisearchInFilter,
  buildMeilisearchNameQuery,
} from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import { getNpcType } from "@lootlog/domain/npc-type";
import type { NpcSearchQuery } from "./npc-search-query.js";
import { NPCS_INDEX } from "./search-index.js";
import type { IndexNpcsCommand } from "./index-npcs-command.js";
import type {
  MonsterLocation,
  MonsterLocationsCommand,
} from "./monster-locations-command.js";
import type { NpcHit } from "./npc-hit.js";

type IndexNpc = IndexNpcsCommand["npcs"][number];

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

  const identityNamespace =
    npc.identityNamespace ?? NpcIdentityNamespace.LEGACY;

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
    identityNamespace,
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    prof,
    type,
    margonemType: npc.margonemType,
    worlds: [npc.world],
    gameVersion: npc.gameVersion,
    uid: npcCatalogKey({ ...npc, identityNamespace }),
    monsterKey: npcMonsterKey({ ...npc, type }),
    observedLootId: npc.lootId ?? null,
    firstSeenAt: toSeenAt(npc.observedAt),
  };
};

/**
 * A stored catalog entry. `locations` comes from the API's daily monster
 * statistics, not from loots; entries it has not reached yet have none.
 */
type NpcDocument = ReturnType<typeof toNpcDocument> & {
  locations?: ReadonlyArray<typeof MonsterLocation.Type>;
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
    Pick<NpcDocument, "uid" | "monsterKey" | "lvl" | "observedLootId">
  >,
) =>
  Object.values(groupBy(documents, ({ monsterKey }) => monsterKey)).flatMap(
    (identities) => {
      const latest = maxBy(
        identities,
        ({ observedLootId }) => observedLootId ?? 0,
      );

      return identities.map(({ uid, lvl }) => ({
        uid,
        current: lvl === latest?.lvl,
      }));
    },
  );

const MONSTERS_PER_READ = 100;

const MONSTER_DOCUMENTS_PAGE = 1000;

const toNpcHit = (document: NpcDocument): NpcHit =>
  pick(document, [
    "id",
    "identityNamespace",
    "name",
    "icon",
    "lvl",
    "wt",
    "prof",
    "type",
    "margonemType",
    "worlds",
    "gameVersion",
  ]);

/** Whether `stored` comes from a later loot than `incoming`. */
const isNewerObservation = (
  stored: Pick<NpcDocument, "observedLootId">,
  incoming: Pick<NpcDocument, "observedLootId">,
) =>
  incoming.observedLootId !== null &&
  stored.observedLootId !== null &&
  stored.observedLootId > incoming.observedLootId;

/**
 * One catalog entry from two observations: the later loot's attributes,
 * every world of both, the earlier first sighting and the stored locations. Delivery order is not chronology: a retried or
 * redelivered publication can arrive after a newer one. An observation
 * without a loot id, from an older publisher, counts as the latest.
 */
export const mergeNpcDocument = (
  incoming: NpcDocument,
  stored: NpcDocument,
): NpcDocument => {
  const locations = stored.locations ?? incoming.locations;

  return {
    ...(isNewerObservation(stored, incoming) ? stored : incoming),
    worlds: uniqueWorlds([...incoming.worlds, ...stored.worlds]),
    // Entries indexed before first sightings were recorded have none.
    firstSeenAt: earliestSeenAt(incoming.firstSeenAt, stored.firstSeenAt),
    ...(locations && { locations }),
  };
};

/** Documents of one catalog entry in one batch merge into one. */
export const mergeNpcDocuments = (
  documents: ReadonlyArray<NpcDocument>,
): NpcDocument[] => {
  const byUid = new Map<string, NpcDocument>();

  for (const document of documents) {
    const existing = byUid.get(document.uid);

    byUid.set(
      document.uid,
      existing ? mergeNpcDocument(document, existing) : document,
    );
  }

  return [...byUid.values()];
};

/** Every catalog identity of the given monsters, with only `fields` read. */
const readMonsterDocuments = Effect.fn("SearchNpcs.readMonsterDocuments")(
  function* <Field extends keyof NpcDocument>(
    index: Index<NpcDocument>,
    monsterKeys: ReadonlyArray<string>,
    fields: Array<Extract<keyof Pick<NpcDocument, Field>, string>>,
  ) {
    const documents: Array<Pick<NpcDocument, Field>> = [];

    for (const keys of chunk([...monsterKeys], MONSTERS_PER_READ)) {
      for (let offset = 0; ; offset += MONSTER_DOCUMENTS_PAGE) {
        const page = yield* attemptMeilisearch(
          "search.npcs.monsters.existing",
          () =>
            index.getDocuments<Pick<NpcDocument, Field>>({
              filter: buildMeilisearchInFilter("monsterKey", keys),
              fields,
              limit: MONSTER_DOCUMENTS_PAGE,
              offset,
            }),
        );

        documents.push(...page.results);

        if (page.results.length < MONSTER_DOCUMENTS_PAGE) break;
      }
    }

    return documents;
  },
);

export const makeNpcsModule = (meilisearch: Meilisearch, logger: AppLogger) => {
  const getNpcs = Effect.fn("SearchNpcs.get")(function* ({
    ids,
    limit,
    search,
  }: NpcSearchQuery) {
    const index = meilisearch.index<NpcDocument>(NPCS_INDEX);

    const { searchTerm, query } = buildMeilisearchNameQuery({
      ids,
      limit,
      search,
    });

    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => {
        const hits = response.hits.map(toNpcHit);

        return ids && ids.length > 0 ? hits : collapseByNameAndType(hits);
      }),
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("NPC search error", { error })),
      ),
    );
  });

  const indexNpcs = Effect.fn("SearchNpcs.index")(function* (
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

    const index = meilisearch.index<NpcDocument>(NPCS_INDEX);
    const documents = mergeNpcDocuments(validNpcs.map(toNpcDocument));

    const identities = yield* readMonsterDocuments(
      index,
      [...new Set(documents.map(({ monsterKey }) => monsterKey))],
      ["uid", "monsterKey", "lvl", "observedLootId", "current"],
    );

    const storedByUid = new Map(
      identities.map((identity) => [identity.uid, identity]),
    );

    const incomingUids = new Set(documents.map(({ uid }) => uid));

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

    yield* indexChangedDocuments(index, documents, (npc, stored) => ({
      ...(stored ? mergeNpcDocument(npc, stored) : npc),
      current: current.get(npc.uid) ?? true,
    }));

    // The monster's other identities, when this batch changed which is current.
    const superseded = identities.flatMap(({ uid, current: stored }) =>
      !incomingUids.has(uid) && current.get(uid) !== stored
        ? [{ uid, current: current.get(uid) ?? true }]
        : [],
    );

    for (const batch of chunk(superseded, 500)) {
      yield* completeMeilisearchTask("search.npcs.current.index", () =>
        index.updateDocuments(batch),
      );
    }
  });

  /**
   * Replaces each monster's locations on every catalog identity of it. Only
   * the locations are written, so observations indexed meanwhile are kept.
   */
  const setLocations = Effect.fn("SearchNpcs.setLocations")(function* (
    data: MonsterLocationsCommand,
  ) {
    const index = meilisearch.index<NpcDocument>(NPCS_INDEX);

    const locationsByMonster = new Map(
      data.monsters.map((monster) => [
        npcMonsterKey(monster),
        monster.locations,
      ]),
    );

    const documents = yield* readMonsterDocuments(
      index,
      [...locationsByMonster.keys()],
      ["uid", "monsterKey", "locations"],
    );

    const changed = documents.flatMap((document) => {
      const locations = locationsByMonster.get(document.monsterKey);

      return locations && !Bun.deepEquals(locations, document.locations)
        ? [{ uid: document.uid, locations }]
        : [];
    });

    for (const batch of chunk(changed, 500)) {
      yield* completeMeilisearchTask("search.npcs.locations.index", () =>
        index.updateDocuments(batch),
      );
    }
  });

  return { getNpcs, indexNpcs, setLocations } satisfies {
    readonly getNpcs: (
      input: NpcSearchQuery,
    ) => Effect.Effect<ReadonlyArray<NpcHit>, SearchOperationFailure>;
    readonly indexNpcs: (
      data: IndexNpcsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
    readonly setLocations: (
      data: MonsterLocationsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
