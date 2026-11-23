import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import type {
  CatalogItemObservation,
  CatalogNpcObservation,
} from "@lootlog/protocol/rabbit/catalog";
import { splitItemStat } from "@lootlog/domain/item-stat";
import { Schema } from "effect";
import {
  compareNpcsStrongestFirst,
  isDropSourceBossType,
} from "@lootlog/domain/npc-type";
import type {
  GuildLootCreatedEventV2,
  GuildLootEventNpc,
} from "@lootlog/schema/loot-events";
import type { LootCreatedNotificationEventV2 } from "@lootlog/schema/notifications";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";

import {
  LootPublicationPayload,
  type LootPublication,
} from "./loot-publication-outbox.js";
import type { AcceptedNpcSnapshot } from "#src/loots/submission/loot-submission-acceptance.repository";
import {
  type AcceptedPlayer,
  mapItems,
  mapPlayers,
} from "./loot-submission-normalization.js";
import type { AcceptanceOutcome } from "./loot-submission-outcome.js";

function findDropSource(
  npcs: AcceptedNpcSnapshot[],
  submission: CreateLootRequest,
): AcceptedNpcSnapshot | undefined {
  if (submission.source !== "FIGHT" && submission.source !== "DIALOG")
    return undefined;

  if (npcs.length === 1) return npcs[0];

  if (submission.source === "DIALOG") return undefined;

  const bosses = npcs.filter((npc) => isDropSourceBossType(npc.type));

  return bosses.length === 1 ? bosses[0] : undefined;
}

export function mapNpcEvents(npcs: AcceptedNpcSnapshot[]): GuildLootEventNpc[] {
  return npcs
    .toSorted(compareNpcsStrongestFirst)
    .map(({ lvl, prof, type, wt }) => ({ lvl, prof, type, wt }));
}

function getUniqueOrganizationIds(
  submissions: Array<{ guildId: string }>,
): string[] {
  return [...new Set(submissions.map(({ guildId }) => guildId))];
}

export function createdPublications(
  lootId: number,
  organizationIds: string[],
  npcs: GuildLootEventNpc[],
): LootPublication[] {
  return organizationIds.flatMap((guildId): LootPublication[] => [
    { organizationIds: [guildId], payload: { kind: "cache" } },
    {
      organizationIds: [guildId],
      payload: {
        kind: "rabbit",
        routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        data: {
          version: 2,
          guildId,
          lootId,
          npcs,
        } satisfies GuildLootCreatedEventV2,
      },
    },
  ]);
}

export function newLootPublications(options: {
  lootId: number;
  npcs: AcceptedNpcSnapshot[];
  observedAt: Date;
  outcome: AcceptanceOutcome;
  submission: CreateLootRequest;
  players: ReadonlyArray<AcceptedPlayer>;
}): LootPublication[] {
  const organizationIds = getUniqueOrganizationIds(
    options.outcome.submissionData,
  );

  const intents = createdPublications(
    options.lootId,
    organizationIds,
    mapNpcEvents(options.npcs),
  );

  const rabbit = <
    Key extends Extract<
      LootPublication["payload"],
      { kind: "rabbit" }
    >["routingKey"],
  >(
    routingKey: Key,
    data: CanonicalRabbitEvent<Key>,
  ) => {
    intents.push({
      organizationIds,
      payload: Schema.decodeUnknownSync(LootPublicationPayload)({
        kind: "rabbit",
        routingKey,
        data,
      }),
    });
  };

  rabbit(
    RabbitRoutingKey.SEARCH_PLAYERS_INDEX,
    mapPlayers(options.players).map((player) => ({
      ...player,
      prof: player.prof ?? "",
      world: options.submission.world,
    })),
  );

  const searchNpc = (npc: AcceptedNpcSnapshot) => ({
    id: npc.npcId,
    identityNamespace: npc.identityNamespace,
    name: npc.name,
    lvl: npc.lvl,
    prof: npc.prof ?? "",
    icon: npc.icon,
    wt: npc.wt,
    type: npc.type,
    margonemType: npc.margonemType,
    gameVersion: npc.gameVersion,
  });

  const observedAt = options.observedAt.toISOString();
  const dropSource = findDropSource(options.npcs, options.submission);

  rabbit(
    RabbitRoutingKey.CATALOG_NPCS_INDEX,
    options.npcs.flatMap((npc): CatalogNpcObservation[] => {
      const { icon, lvl, wt, type, margonemType } = npc;

      if (
        icon === null ||
        lvl === null ||
        wt === null ||
        type === null ||
        margonemType === null
      )
        return [];

      return [
        {
          ...searchNpc(npc),
          icon,
          lvl,
          wt,
          type,
          margonemType,
          lootId: options.lootId,
          ...(npc.snapshotHash && { snapshotHash: npc.snapshotHash }),
          world: options.submission.world,
          observedAt,
        },
      ];
    }),
  );
  const items = mapItems(options.submission.loots);

  if (items.length > 0)
    rabbit(
      RabbitRoutingKey.CATALOG_ITEMS_INDEX,
      items.map((item): CatalogItemObservation => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        stat: splitItemStat(item.stat).revision,
        lvl: item.lvl,
        rarity: item.rarity ?? null,
        type: item.type ?? null,
        worlds: [options.submission.world],
        gameVersion: options.submission.gameVersion,
        observedAt,
        ...(dropSource && { droppedBy: searchNpc(dropSource) }),
      })),
    );
  rabbit(RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED, {
    version: 2,
    lootId: options.lootId,
    world: options.submission.world,
    guildIds: organizationIds,
    itemIds: items.map((item) => item.id),
    itemNames: items.map((item) => item.name),
    npcs: options.npcs.map((npc) => ({
      type: npc.type ?? null,
      lvl: npc.lvl ?? null,
    })),
  } satisfies LootCreatedNotificationEventV2);

  return intents;
}
