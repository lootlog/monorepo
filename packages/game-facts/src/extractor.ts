import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import * as Schema from "effect/Schema";
import {
  GameFact as GameFactSchema,
  gameFactSubject,
  type GameFact,
  type ObservedGameFact,
} from "./facts.js";
import type {
  DecodedPacket,
  FightPacket,
  GamePacket,
  ItemEntry,
  LootPacket,
  ShopPacket,
  TownPacket,
  WarriorStat,
} from "./packets.js";

const IGNORED_KEYS: ReadonlySet<string> = new Set([
  "e",
  "ev",
  "h",
  "other",
  "chat",
  "businessCards",
  "browser_token",
  "cl",
  "js",
  "js_script",
  "credits",
  "runes",
  "config",
  "emo",
  "walking",
  "msg",
  "message",
  "notices",
  "worldConfig",
  "tutorial",
  "world_time",
  "game_hour",
  "game_hour_mod",
  "matchmaking_state",
  "tracking",
  "handheld_minimap",
  "barters",
  "sraj_tpl",
  "friends",
  "friends_max",
  "enemies",
  "enemies_max",
  "clan_fr",
  "clan_en",
  "party",
  "settings",
  "login",
  "captcha",
  "logoff_time_left",
  "myclan",
  "members",
  "depo",
  "depo_opentabs",
  "promotions",
  "rewards_calendar_active",
  "auctions",
  "ask",
]);

export const EXTRACTION_SKIPS = [
  "PACKET_MALFORMED",
  "GATEWAYS_WITHOUT_MAP",
  "GATEWAY_MALFORMED",
  "NPC_WITHOUT_MAP",
  "DIALOG_NPC_UNKNOWN",
  "DIALOG_WITHOUT_OPTIONS",
  "SHOP_INCOMPLETE",
  "ITEM_INCOMPLETE",
  "LOOT_WITHOUT_FIGHT",
  "FIGHT_NPC_UNKNOWN",
  "ELASTIC_MONSTER_STATS",
  "FACT_OUTSIDE_CONTRACT",
] as const;

export type ExtractionSkip = (typeof EXTRACTION_SKIPS)[number];

export type ExtractionCoverage = {
  readonly handled: Readonly<Record<string, number>>;
  readonly ignored: Readonly<Record<string, number>>;
  readonly unknown: Readonly<Record<string, number>>;
  readonly skipped: Readonly<Partial<Record<ExtractionSkip, number>>>;
};

const DECORATION_NPC_TYPE = 4;

const GATEWAY_FIELDS = 5;

const DIALOG_LINE_FIELDS = 3;

const DIALOG_HEADER = 0;

const DIALOG_END = 4;

const NPC_TALK_LINE = 1;

const PLAYER_OPTION_LINE = 2;

const NO_LEVEL_LIMIT = 1000;

const DIALOG_OPTION_ID = /^\d+(?:\.\d+)?$/u;

const isGameFact = Schema.is(GameFactSchema);

const toInt = (value: number | undefined): number | null =>
  value !== undefined && Number.isSafeInteger(value) ? value : null;

const toPositiveId = (value: number | undefined): number | null => {
  const number = toInt(value);

  return number !== null && number > 0 ? number : null;
};

const toTile = (value: number | undefined): number | null => {
  const number = toInt(value);

  return number !== null && number >= 0 ? number : null;
};

const nonEmpty = (value: string | undefined) =>
  value === undefined || value === "" ? null : value;

const statValue = (value: WarriorStat | undefined): number | null =>
  toInt(value?.cur);

const fromText = (value: string | null | undefined) =>
  value === null || value === undefined || value.trim() === ""
    ? undefined
    : Number(value);

type Request = {
  readonly task: string | null;
  readonly id: string | null;
  readonly c: string | null;
};

const readRequest = (request: string | undefined): Request => {
  const params = new URLSearchParams(request ?? "");

  return { task: params.get("t"), id: params.get("id"), c: params.get("c") };
};

const nodeIdOf = (optionId: string) => optionId.split(".")[0] ?? optionId;

type TalkState = { readonly runtimeId: number; readonly npcId: number | null };

type DialogChoice = { readonly npcId: number; readonly optionId: string };

type NpcTemplate = { readonly type: number | null; readonly elastic: boolean };

export const createGameFactExtractor = () => {
  const facts = new Map<string, ObservedGameFact>();

  const handled: Record<string, number> = {};

  const ignored: Record<string, number> = {};

  const unknown: Record<string, number> = {};

  const skipped: Partial<Record<ExtractionSkip, number>> = {};

  const npcTemplates = new Map<number, NpcTemplate>();

  const icons = new Map<number, string>();

  const runtimeNpcs = new Map<number, number>();

  let mapId: number | null = null;

  let townNames: ReadonlyMap<string, string> = new Map();

  let talk: TalkState | null = null;

  let pendingTeleport: DialogChoice | null = null;

  let fightNpcIds: number[] = [];

  let observedAt = "";

  const count = (record: Record<string, number>, key: string) => {
    record[key] = (record[key] ?? 0) + 1;
  };

  const skip = (reason: ExtractionSkip, times = 1) => {
    skipped[reason] = (skipped[reason] ?? 0) + times;
  };

  const emit = (fact: GameFact) => {
    if (!isGameFact(fact)) {
      skip("FACT_OUTSIDE_CONTRACT");

      return;
    }

    const key = `${fact.kind}:${gameFactSubject(fact)}:${stableJsonStringify(fact)}`;

    facts.set(key, { observedAt, fact });
  };

  const npcOf = (runtimeId: number | null) =>
    runtimeId === null ? undefined : runtimeNpcs.get(runtimeId);

  const observeTown = (town: TownPacket) => {
    const id = toPositiveId(town.id);

    if (id === null) {
      skip("PACKET_MALFORMED");

      return;
    }

    if (id !== mapId) runtimeNpcs.clear();
    mapId = id;

    if (pendingTeleport) {
      emit({
        kind: "DIALOG_TRANSITION",
        ...pendingTeleport,
        nextNodeId: null,
        shopId: null,
        teleportMapId: id,
      });
      pendingTeleport = null;
    }

    emit({
      kind: "MAP",
      mapId: id,
      parentMapId: toPositiveId(town.mainid),
      name: town.name,
      file: town.file,
      background: nonEmpty(town.bg),
      pvp: toInt(town.pvp) ?? 0,
      minLevel: toPositiveId(town.params?.lvlMin),
      maxLevel: toPositiveId(town.params?.lvlMax),
      respawnMapName: nonEmpty(town.params?.respawn),
    });
  };

  const observeGateways = (gateways: ReadonlyArray<number>) => {
    if (mapId === null) {
      skip("GATEWAYS_WITHOUT_MAP");

      return;
    }

    for (
      let index = 0;
      index + GATEWAY_FIELDS <= gateways.length;
      index += GATEWAY_FIELDS
    ) {
      const toMapId = toPositiveId(gateways[index]);
      const x = toTile(gateways[index + 1]);
      const y = toTile(gateways[index + 2]);
      const levels = toInt(gateways[index + 4]) ?? 0;

      if (toMapId === null || x === null || y === null) {
        skip("GATEWAY_MALFORMED");
        continue;
      }

      const minLevel = levels & 0xffff;
      const maxLevel = (levels >> 16) & 0xffff;

      emit({
        kind: "GATEWAY",
        fromMapId: mapId,
        toMapId,
        toMapName: townNames.get(String(toMapId)) ?? null,
        x,
        y,
        requiresKey: Boolean(gateways[index + 3]),
        minLevel: minLevel === 0 ? null : minLevel,
        maxLevel:
          maxLevel === 0 || maxLevel >= NO_LEVEL_LIMIT ? null : maxLevel,
      });
    }
  };

  const observeIcons = (list: NonNullable<GamePacket["icons"]>) => {
    for (const { id, icon } of list) {
      if (icon) icons.set(id, normalizeNpcIcon(icon));
    }
  };

  const observeNpcTemplates = (list: NonNullable<GamePacket["npc_tpls"]>) => {
    for (const entry of list) {
      const npcId = toPositiveId(entry.id);

      if (npcId === null) continue;

      const type = toInt(entry.type);
      const elastic = entry.elasticLevelFactor !== undefined;

      npcTemplates.set(npcId, { type, elastic });

      if (type === DECORATION_NPC_TYPE) continue;

      emit({
        kind: "NPC",
        npcId,
        name: entry.nick,
        level: elastic ? null : toInt(entry.level),
        profession: nonEmpty(entry.prof),
        margonemType: type,
        warriorType: toInt(entry.warrior_type),
        elastic,
      });
    }
  };

  const observeNpcs = (list: NonNullable<GamePacket["npcs"]>) => {
    for (const entry of list) {
      const runtimeId = toPositiveId(entry.id);
      const npcId = toPositiveId(entry.tpl);

      if (runtimeId === null || npcId === null) continue;
      runtimeNpcs.set(runtimeId, npcId);

      if (npcTemplates.get(npcId)?.type === DECORATION_NPC_TYPE) continue;

      const x = toTile(entry.x);
      const y = toTile(entry.y);

      if (mapId === null || x === null || y === null) {
        skip("NPC_WITHOUT_MAP");
        continue;
      }

      const iconId = toInt(entry.icon?.id);

      emit({
        kind: "NPC_PLACEMENT",
        mapId,
        npcId,
        x,
        y,
        icon: iconId === null ? null : (icons.get(iconId) ?? null),
      });
    }
  };

  const chosenOption = (request: Request): DialogChoice | null => {
    const npcId =
      request.task === "talk"
        ? npcOf(toPositiveId(fromText(request.id)))
        : undefined;

    return request.c && DIALOG_OPTION_ID.test(request.c) && npcId !== undefined
      ? { npcId, optionId: request.c }
      : null;
  };

  const observeDialogEnd = (
    packet: GamePacket,
    chosen: DialogChoice | null,
  ) => {
    talk = null;

    if (!chosen) return;

    if (packet.t === "reload") {
      pendingTeleport = chosen;

      return;
    }

    emit({
      kind: "DIALOG_TRANSITION",
      ...chosen,
      nextNodeId: null,
      shopId: toPositiveId(packet.shop?.id),
      teleportMapId: null,
    });
  };

  const observeDialog = (
    lines: ReadonlyArray<string>,
    packet: GamePacket,
    request: Request,
  ) => {
    const chosen = chosenOption(request);

    if (toInt(fromText(lines[0])) === DIALOG_END) {
      observeDialogEnd(packet, chosen);

      return;
    }

    let speaker = "";
    let text = "";

    const options: Array<{ optionId: string; text: string; flags: number }> =
      [];

    for (
      let index = 0;
      index + DIALOG_LINE_FIELDS <= lines.length;
      index += DIALOG_LINE_FIELDS
    ) {
      const flags = toInt(fromText(lines[index])) ?? 0;
      const lineText = lines[index + 1] ?? "";
      const optionId = lines[index + 2] ?? "";

      if (flags === DIALOG_HEADER) {
        const runtimeId = toPositiveId(fromText(optionId));

        speaker = lineText;
        talk =
          runtimeId === null
            ? null
            : { runtimeId, npcId: npcOf(runtimeId) ?? null };
        continue;
      }

      if (flags & NPC_TALK_LINE) text = lineText;

      if (flags & PLAYER_OPTION_LINE && DIALOG_OPTION_ID.test(optionId)) {
        options.push({ optionId, text: lineText, flags });
      }
    }

    if (!talk || talk.npcId === null) {
      skip("DIALOG_NPC_UNKNOWN");

      return;
    }

    const firstOption = options[0]?.optionId;

    if (firstOption === undefined) {
      skip("DIALOG_WITHOUT_OPTIONS");

      return;
    }

    const nodeId = nodeIdOf(firstOption);

    emit({
      kind: "DIALOG_NODE",
      npcId: talk.npcId,
      nodeId,
      speaker,
      text,
      options,
    });

    if (chosen) {
      emit({
        kind: "DIALOG_TRANSITION",
        ...chosen,
        nextNodeId: nodeId,
        shopId: null,
        teleportMapId: null,
      });
    }
  };

  const observeShop = (shop: ShopPacket, request: Request) => {
    if (shop.sellAction !== undefined || shop.buyAction !== undefined) return;
    const shopId = toPositiveId(shop.id);

    if (shopId === null || shop.items_offers === undefined) {
      skip("SHOP_INCOMPLETE");

      return;
    }

    const offers = shop.items_offers.flatMap((offer) => {
      const itemId = toPositiveId(offer.tplId);
      const price = toInt(offer.price);

      return itemId === null || price === null || price < 0
        ? []
        : [
            {
              itemId,
              price,
              quantity: Math.max(toInt(offer.quantity) ?? 1, 0),
            },
          ];
    });

    const runtimeId =
      request.task === "talk" ? toPositiveId(fromText(request.id)) : null;

    emit({
      kind: "SHOP",
      shopId,
      npcId: npcOf(runtimeId) ?? null,
      currency: shop.cur ?? "zl",
      buyBackPercent: toInt(shop.buyp),
      offers,
    });
  };

  const emitItem = (itemId: number | null, item: ItemEntry) => {
    if (itemId === null || item.name === undefined || item.icon === undefined) {
      skip("ITEM_INCOMPLETE");

      return;
    }

    emit({
      kind: "ITEM",
      itemId,
      name: item.name,
      icon: item.icon,
      itemClass: toInt(item.cl) ?? 0,
      stat: item.stat ?? "",
      price: Math.max(toInt(item.pr) ?? 0, 0),
      currency: item.prc ?? "zl",
    });
  };

  const observeItemTemplates = (
    templates: NonNullable<GamePacket["item_tpl"]>,
  ) => {
    for (const [key, template] of Object.entries(templates)) {
      emitItem(toPositiveId(template.id ?? fromText(key)), template);
    }
  };

  const observeLootItems = (
    items: NonNullable<GamePacket["item"]>,
    loot: LootPacket,
  ) => {
    if (loot.source !== "fight") return;
    const states = loot.states ?? {};

    for (const [id, item] of Object.entries(items)) {
      if (item.loc !== "l" || !Object.hasOwn(states, id)) continue;
      const itemId = toPositiveId(item.tpl);

      emitItem(itemId, item);

      if (itemId === null) continue;

      if (fightNpcIds.length === 0) {
        skip("LOOT_WITHOUT_FIGHT");
        continue;
      }

      emit({ kind: "DROP", itemId, npcIds: fightNpcIds });
    }
  };

  const observeFight = (fight: FightPacket) => {
    const npcIds = new Set<number>();

    for (const warrior of Object.values(fight.w ?? {})) {
      if (toInt(warrior.npc) !== 1) continue;
      const npcId = npcOf(toPositiveId(warrior.originalId));

      if (npcId === undefined) {
        skip("FIGHT_NPC_UNKNOWN");
        continue;
      }

      npcIds.add(npcId);

      const level = toInt(warrior.lvl);
      const hp = toInt(warrior.hp?.max);

      if (warrior.name === undefined || level === null || hp === null) continue;

      if (npcTemplates.get(npcId)?.elastic) {
        skip("ELASTIC_MONSTER_STATS");
        continue;
      }

      emit({
        kind: "MONSTER_STATS",
        npcId,
        name: warrior.name,
        level,
        profession: nonEmpty(warrior.prof),
        warriorType: toInt(warrior.wt),
        hp,
        armor: statValue(warrior.ac),
        fireResistance: statValue(warrior.resfire),
        frostResistance: statValue(warrior.resfrost),
        lightningResistance: statValue(warrior.reslight),
        poisonResistance: statValue(warrior.act),
      });
    }

    if (fight.init !== undefined && npcIds.size > 0) {
      fightNpcIds = [...npcIds].sort((a, b) => a - b);
    }
  };

  const observeRemovedNpcs = (list: NonNullable<GamePacket["npcs_del"]>) => {
    for (const { id } of list) {
      if (id !== talk?.runtimeId) runtimeNpcs.delete(id);
    }
  };

  const countKeys = ({ keys, packet, malformed }: DecodedPacket) => {
    for (const key of keys) {
      if (malformed.includes(key)) continue;

      if (Object.hasOwn(packet, key)) count(handled, key);
      else if (IGNORED_KEYS.has(key)) count(ignored, key);
      else count(unknown, key);
    }
  };

  const observePacket = (packet: GamePacket, request: Request) => {
    if (packet.icons) observeIcons(packet.icons);

    if (packet.npc_tpls) observeNpcTemplates(packet.npc_tpls);

    if (packet.townname) townNames = new Map(Object.entries(packet.townname));

    if (packet.town) observeTown(packet.town);

    if (packet.gw2) observeGateways(packet.gw2);

    if (packet.npcs) observeNpcs(packet.npcs);

    if (packet.f) observeFight(packet.f);

    if (packet.d) observeDialog(packet.d, packet, request);

    if (packet.shop) observeShop(packet.shop, request);

    if (packet.item_tpl) observeItemTemplates(packet.item_tpl);

    if (packet.item && packet.loot) observeLootItems(packet.item, packet.loot);

    if (packet.npcs_del) observeRemovedNpcs(packet.npcs_del);
  };

  return {
    observe: (
      decoded: DecodedPacket,
      options: { readonly request?: string; readonly observedAt: string },
    ) => {
      observedAt = options.observedAt;
      countKeys(decoded);
      skip("PACKET_MALFORMED", decoded.malformed.length);
      observePacket(decoded.packet, readRequest(options.request));
    },
    facts: (): ObservedGameFact[] => [...facts.values()],
    coverage: (): ExtractionCoverage => ({
      handled,
      ignored,
      unknown,
      skipped,
    }),
  };
};
