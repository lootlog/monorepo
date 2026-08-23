import { useFriendsStore } from "@/store/friends.store";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import { parseFriendsListFromEvent } from "@/utils/game/events/parse-friends-list-from-event";
import type {
  GameEvent,
  OtherCreate,
  OtherEntry,
} from "@lootlog/margonem/game-events";
import {
  createRuntimeAdapter,
  type MargonemRuntimeAdapter,
} from "./runtime-adapter";
import { runtimeOtherHandles } from "./runtime-other-handles";
import type {
  RuntimeEventEnvelope,
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
  RuntimeNpc,
  RuntimeOther,
  RuntimePartyMember,
} from "./runtime.types";

type AppliedNpcEntry = Readonly<{
  actions?: number;
  group?: number;
  grp?: number;
  icon?: string | Readonly<{ id: number }>;
  id: number;
  level?: number;
  lvl?: number;
  nick?: string;
  prof?: string;
  resp_rand?: number;
  tpl?: number;
  type?: number;
  warrior_type?: number;
  wt?: number;
  x?: number;
  y?: number;
}>;

type NpcTemplate = Readonly<{
  id: number;
  level?: number;
  nick: string;
  prof: string;
  resp_rand?: number;
  type: number;
  warrior_type?: number;
}>;

type Dependencies = {
  adapter: MargonemRuntimeAdapter;
};

const EMPTY_NPCS = Object.freeze({}) as Readonly<Record<number, RuntimeNpc>>;
const EMPTY_OTHERS = Object.freeze({}) as Readonly<
  Record<string, RuntimeOther>
>;

function createsOther(entry: OtherEntry): entry is OtherCreate {
  return "action" in entry && entry.action === "CREATE";
}

function deletesOther(entry: OtherEntry): boolean {
  return "del" in entry && entry.del === 1;
}

function patchGame(
  current: RuntimeGameSnapshot,
  event: GameEvent,
): RuntimeGameSnapshot {
  const heroPatch = event.h;
  const town = event.town;
  const warriorStats = heroPatch?.warrior_stats;
  let clan = current.hero.clan;
  if (heroPatch && "clan" in heroPatch) {
    clan = heroPatch.clan ? Object.freeze({ ...heroPatch.clan }) : undefined;
  }

  return Object.freeze({
    hero: Object.freeze({
      accountId: String(heroPatch?.account ?? current.hero.accountId),
      characterId: String(heroPatch?.id ?? current.hero.characterId),
      clan,
      currentHp: warriorStats?.hp ?? heroPatch?.hp ?? current.hero.currentHp,
      icon: heroPatch?.img ?? current.hero.icon,
      level: heroPatch?.lvl ?? current.hero.level,
      maxHp: warriorStats?.maxhp ?? heroPatch?.maxhp ?? current.hero.maxHp,
      name: heroPatch?.nick ?? current.hero.name,
      profession: heroPatch?.prof ?? current.hero.profession,
      x: heroPatch?.x ?? current.hero.x,
      y: heroPatch?.y ?? current.hero.y,
    }),
    interface: current.interface,
    map: town
      ? Object.freeze({
          id: town.id,
          name: town.name,
          visibility: town.visibility,
        })
      : current.map,
    world: current.world,
  });
}

function normalizeOtherFromEvent(
  characterId: string,
  entry: OtherCreate,
): RuntimeOther {
  return Object.freeze({
    accountId: String(entry.account),
    characterId,
    icon: entry.icon,
    level: entry.lvl,
    name: entry.nick,
    profession: entry.prof,
  });
}

function normalizeParty(event: NonNullable<GameEvent["party"]>) {
  return Object.freeze(
    Object.values(event.members ?? {}).map<RuntimePartyMember>((member) => {
      const characterId = String(member.id);
      return Object.freeze({
        accountId: String(member.account),
        characterId,
        currentHp: member.hp_cur ?? 0,
        icon: member.icon,
        isLeader: member.commander === 1,
        maxHp: member.hp_max ?? 0,
        name: member.nick,
        profession: null,
      });
    }),
  );
}

export class RuntimeStateProjection {
  private readonly adapter: MargonemRuntimeAdapter;
  private readonly icons = new Map<number, string>();
  private readonly npcTemplates = new Map<number, NpcTemplate>();

  constructor(dependencies?: Partial<Dependencies>) {
    this.adapter = dependencies?.adapter ?? createRuntimeAdapter();
  }

  bootstrap(): boolean {
    try {
      const snapshot = this.adapter.getStateSnapshot();
      const otherHandles = this.adapter.getAllOtherHandles();
      useGameStore.getState().replaceGame(snapshot.game);
      useNpcsStore.getState().replaceNpcs(snapshot.npcs);
      runtimeOtherHandles.replace(otherHandles);
      useOthersStore.getState().replaceOthers(snapshot.others);
      usePartyStore.getState().replaceParty(snapshot.party);
      useFriendsStore.getState().replaceFriends(snapshot.friends, 0);
      return true;
    } catch {
      this.clearStores();
      return false;
    }
  }

  captureIngress(envelope: RuntimeEventEnvelope): RuntimeEventEnvelope {
    const event = envelope.raw;
    if (!event) return envelope;

    const needsGame = envelope.facts.some(
      (fact) =>
        fact.kind === "afk" ||
        fact.kind === "loot" ||
        fact.kind === "npc-delete" ||
        (fact.kind === "battle" && event.f?.endBattle === 1),
    );
    const npcsById: Record<number, RuntimeNpc> = {};
    for (const deletion of event.npcs_del ?? []) {
      const npc = useNpcsStore.getState().getNpc(deletion.id);
      if (npc) npcsById[deletion.id] = npc;
    }
    const dialogNpcId = Number(
      Array.isArray(event.d) ? event.d[2] : Number.NaN,
    );
    if (Number.isSafeInteger(dialogNpcId) && dialogNpcId > 0) {
      const npc = useNpcsStore.getState().getNpc(dialogNpcId);
      if (npc) npcsById[dialogNpcId] = npc;
    }

    const othersById: Record<string, RuntimeOther> = {};
    for (const warriorId of Object.keys(event.f?.w ?? {})) {
      const other = useOthersStore.getState().getOther(warriorId);
      if (other) othersById[warriorId] = other;
    }

    const ingress: RuntimeIngressSnapshot = Object.freeze({
      game: needsGame ? useGameStore.getState().game : null,
      intent: envelope.ingress.intent,
      npcsById:
        Object.keys(npcsById).length > 0 ? Object.freeze(npcsById) : EMPTY_NPCS,
      othersById:
        Object.keys(othersById).length > 0
          ? Object.freeze(othersById)
          : EMPTY_OTHERS,
    });

    return Object.freeze({ ...envelope, ingress });
  }

  apply(envelope: RuntimeEventEnvelope): void {
    const event = envelope.raw;
    if (!event) return;

    const currentGame = useGameStore.getState().game;
    const mapChanged = event.town !== undefined;
    if (mapChanged) {
      this.icons.clear();
      this.npcTemplates.clear();
    }

    this.cacheNpcMetadata(event);

    if (currentGame && (event.h || event.town)) {
      useGameStore
        .getState()
        .replaceGame(patchGame(currentGame, event), mapChanged);
    }

    if (event.other || mapChanged) {
      this.applyOthers(event.other ?? {}, mapChanged);
    }
    if (event.npcs || event.npcs_del || mapChanged) {
      this.applyNpcs(event, mapChanged);
    }
    if (event.party) {
      usePartyStore.getState().replaceParty(normalizeParty(event.party));
    }
    if (event.friends !== undefined || event.friends_max !== undefined) {
      this.applyFriends(event);
    }
  }

  cleanup(): void {
    this.icons.clear();
    this.npcTemplates.clear();
    this.clearStores();
  }

  private cacheNpcMetadata(event: GameEvent): void {
    for (const template of event.npc_tpls ?? []) {
      this.npcTemplates.set(template.id, Object.freeze({ ...template }));
    }
    for (const icon of event.icons ?? []) this.icons.set(icon.id, icon.icon);
  }

  private applyOthers(
    others: NonNullable<GameEvent["other"]>,
    mapChanged: boolean,
  ): void {
    const removeIds: string[] = [];
    const upserts: Record<string, RuntimeOther> = {};
    const handleUpserts: Record<
      string,
      NonNullable<ReturnType<MargonemRuntimeAdapter["getOtherHandle"]>>
    > = {};

    for (const [characterId, entry] of Object.entries(others)) {
      if (deletesOther(entry)) {
        removeIds.push(characterId);
        continue;
      }
      if (!createsOther(entry)) continue;

      upserts[characterId] = normalizeOtherFromEvent(characterId, entry);
      try {
        const handle = this.adapter.getOtherHandle(characterId);
        if (handle) handleUpserts[characterId] = handle;
      } catch {
        // The normalized event remains authoritative; handles are UI integration only.
      }
    }

    if (mapChanged) {
      runtimeOtherHandles.replace(handleUpserts);
      useOthersStore.getState().replaceOthers(upserts, true);
      return;
    }

    runtimeOtherHandles.applyBatch({ removeIds, upserts: handleUpserts });
    useOthersStore.getState().applyBatch({ removeIds, upserts });
  }

  private applyNpcs(event: GameEvent, mapChanged: boolean): void {
    const removeIds = (event.npcs_del ?? []).map((npc) => npc.id);
    const upserts: RuntimeNpc[] = [];

    for (const rawNpc of event.npcs ?? []) {
      const npc = this.composeNpc(rawNpc as AppliedNpcEntry);
      if (npc) upserts.push(npc);
    }

    if (mapChanged) {
      useNpcsStore.getState().replaceNpcs(upserts, true);
      return;
    }
    useNpcsStore.getState().applyNpcBatch({ removeIds, upserts });
  }

  private composeNpc(entry: AppliedNpcEntry): RuntimeNpc | undefined {
    const templateId = entry.tpl ?? 0;
    const template = this.npcTemplates.get(templateId);
    const icon =
      typeof entry.icon === "string"
        ? entry.icon
        : this.icons.get(entry.icon?.id ?? -1);
    const name = entry.nick ?? template?.nick;
    const profession = entry.prof ?? template?.prof;
    const type = entry.type ?? template?.type;
    const level = entry.lvl ?? entry.level ?? template?.level;
    const weight = entry.wt ?? entry.warrior_type ?? template?.warrior_type;

    if (
      icon !== undefined &&
      name !== undefined &&
      profession !== undefined &&
      type !== undefined &&
      level !== undefined &&
      weight !== undefined &&
      entry.x !== undefined &&
      entry.y !== undefined
    ) {
      return Object.freeze({
        actions: entry.actions,
        groupId: entry.grp ?? entry.group,
        icon,
        id: entry.id,
        level,
        name,
        profession,
        respawnRandomness: entry.resp_rand ?? template?.resp_rand,
        templateId,
        type,
        weight,
        x: entry.x,
        y: entry.y,
      });
    }

    try {
      return this.adapter.getNpc(entry.id);
    } catch {
      return undefined;
    }
  }

  private applyFriends(event: GameEvent): void {
    const current = useFriendsStore.getState();
    const friends = event.friends
      ? parseFriendsListFromEvent(event.friends).map((friend) =>
          Object.freeze({
            characterId: friend.characterId,
            icon: friend.icon,
            level: Number(friend.lvl),
            location: friend.location,
            name: friend.nick,
            profession: friend.prof,
            status: friend.status,
          }),
        )
      : current.friends;
    current.replaceFriends(friends, event.friends_max ?? current.friendsMax);
  }

  private clearStores(): void {
    useGameStore.getState().clearGame();
    useNpcsStore.getState().clearNpcs();
    usePartyStore.getState().clearParty();
    useFriendsStore.getState().clearFriends();
    runtimeOtherHandles.clear();
    useOthersStore.getState().clearOthers();
  }
}

export const runtimeStateProjection = new RuntimeStateProjection();
