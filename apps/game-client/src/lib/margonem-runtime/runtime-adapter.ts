import type { Engine } from "@lootlog/margonem/engine";
import type { Game } from "@lootlog/margonem/game";
import type { GameHero } from "@lootlog/margonem/hero";
import type { GameMap } from "@lootlog/margonem/map";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { Other } from "@lootlog/margonem/others";
import type {
  RuntimeGameSnapshot,
  RuntimeInterface,
  RuntimeNpc,
  RuntimeOther,
  RuntimePartyMember,
  RuntimeStateSnapshot,
} from "./runtime.types";

export type MargonemInterface = RuntimeInterface;

type RuntimeAdapterWindow = Window & {
  Engine?: Engine;
  g: Game;
  hero: GameHero;
  map: GameMap;
};

const getRuntimeWindow = () => window as unknown as RuntimeAdapterWindow;

export interface MargonemRuntimeAdapter {
  readonly interface: MargonemInterface;
  getAllNpcs(): readonly RuntimeNpc[];
  getAllOthers(): Readonly<Record<string, RuntimeOther>>;
  getAllOtherHandles(): Readonly<Record<string, Other>>;
  getGameSnapshot(): RuntimeGameSnapshot;
  getNpc(id: number): RuntimeNpc | undefined;
  getOther(id: string): RuntimeOther | undefined;
  getOtherHandle(id: string): Other | undefined;
  getParty(): readonly RuntimePartyMember[];
  getStateSnapshot(): RuntimeStateSnapshot;
  isReady(): boolean;
}

type RuntimeOtherData = {
  account?: number | string;
  icon?: string;
  id?: number | string;
  lvl?: number;
  nick?: string;
  prof?: string;
};

type RuntimeOtherWrapper = RuntimeOtherData & { d?: RuntimeOtherData };

export function normalizeNpc(npc: GameNpc): RuntimeNpc {
  return Object.freeze({
    actions: npc.actions,
    groupId: npc.grp,
    icon: npc.icon,
    id: npc.id,
    level: npc.lvl,
    name: npc.nick,
    profession: npc.prof,
    respawnRandomness: npc.resp_rand,
    templateId: npc.tpl,
    type: npc.type,
    weight: npc.wt,
    x: npc.x,
    y: npc.y,
  });
}

function normalizeOther(other: RuntimeOtherWrapper): RuntimeOther | null {
  const data = other.d ?? other;
  const characterId = String(data.id ?? "");
  const accountId = String(data.account ?? "");
  if (!characterId || !accountId) return null;
  return Object.freeze({
    accountId,
    characterId,
    icon: data.icon ?? "",
    level: data.lvl ?? 0,
    name: data.nick ?? "",
    profession: data.prof ?? "",
  });
}

abstract class BaseRuntimeAdapter implements MargonemRuntimeAdapter {
  abstract readonly interface: MargonemInterface;
  protected abstract getRawGame(): {
    hero: GameHero;
    map: GameMap;
    world: string;
  };
  protected abstract getRawNpcs(): readonly GameNpc[];
  protected abstract getRawNpc(id: number): GameNpc | undefined;
  protected abstract getRawOthers(): Record<string, RuntimeOtherWrapper>;
  protected abstract getRawOther(id: string): RuntimeOtherWrapper | undefined;
  protected abstract getRawParty(): readonly RuntimePartyMember[];

  getGameSnapshot(): RuntimeGameSnapshot {
    const { hero, map, world } = this.getRawGame();
    const clan = hero.clan
      ? Object.freeze({
          id: hero.clan.id,
          name: hero.clan.name,
          rank: hero.clan.rank,
        })
      : undefined;
    return Object.freeze({
      hero: Object.freeze({
        accountId: String(hero.account),
        characterId: String(hero.id),
        clan,
        currentHp: hero.warrior_stats?.hp ?? 0,
        icon: hero.img,
        level: hero.lvl,
        maxHp: hero.warrior_stats?.maxhp ?? 0,
        name: hero.nick,
        profession: hero.prof,
        x: hero.x,
        y: hero.y,
      }),
      interface: this.interface,
      map: Object.freeze({
        id: map.id,
        name: map.name,
        visibility: map.visibility,
      }),
      world,
    });
  }

  getAllNpcs(): readonly RuntimeNpc[] {
    return Object.freeze(this.getRawNpcs().map(normalizeNpc));
  }

  getNpc(id: number): RuntimeNpc | undefined {
    const npc = this.getRawNpc(id);
    return npc ? normalizeNpc(npc) : undefined;
  }

  getAllOthers(): Readonly<Record<string, RuntimeOther>> {
    const normalized: Record<string, RuntimeOther> = {};
    for (const [id, other] of Object.entries(this.getRawOthers())) {
      const value = normalizeOther(other);
      if (value) normalized[id] = value;
    }
    return Object.freeze(normalized);
  }

  getAllOtherHandles(): Readonly<Record<string, Other>> {
    return Object.freeze({ ...this.getRawOthers() }) as Readonly<
      Record<string, Other>
    >;
  }

  getOther(id: string): RuntimeOther | undefined {
    const raw = this.getRawOther(id);
    return raw ? (normalizeOther(raw) ?? undefined) : undefined;
  }

  getOtherHandle(id: string): Other | undefined {
    return this.getRawOther(id) as Other | undefined;
  }

  getParty(): readonly RuntimePartyMember[] {
    return Object.freeze([...this.getRawParty()]);
  }

  getStateSnapshot(): RuntimeStateSnapshot {
    return Object.freeze({
      friends: Object.freeze([]),
      game: this.getGameSnapshot(),
      npcs: this.getAllNpcs(),
      others: this.getAllOthers(),
      party: this.getParty(),
    });
  }

  abstract isReady(): boolean;
}

type NiEngine = Engine & {
  communication?: { parseJSON?: (...args: unknown[]) => unknown };
  party?: {
    getMembers?: () => Map<
      number,
      {
        accountId: number;
        hp: [number, number];
        icon: string;
        id: number;
        leader: boolean;
        nick: string;
        profession: string | null;
      }
    >;
  };
};

export class NiRuntimeAdapter extends BaseRuntimeAdapter {
  readonly interface = "ni" as const;

  protected getRawGame() {
    const engine = getRuntimeWindow().Engine as NiEngine;
    return {
      hero: engine.hero.d,
      map: engine.map.d,
      world: engine.worldConfig.getWorldName(),
    };
  }

  protected getRawNpcs(): readonly GameNpc[] {
    const engine = getRuntimeWindow().Engine as NiEngine;
    return Object.values(engine.npcs.check()).map((npc) => npc.d);
  }

  protected getRawNpc(id: number): GameNpc | undefined {
    return (getRuntimeWindow().Engine as NiEngine).npcs.getById(id)?.d;
  }

  protected getRawOthers(): Record<string, RuntimeOtherWrapper> {
    return (getRuntimeWindow().Engine as NiEngine).others.check() as Record<
      string,
      RuntimeOtherWrapper
    >;
  }

  protected getRawOther(id: string): RuntimeOtherWrapper | undefined {
    const others = (getRuntimeWindow().Engine as NiEngine)
      .others as Engine["others"] & {
      getById: (otherId: number) => unknown;
    };
    return others.getById(Number(id)) as RuntimeOtherWrapper | undefined;
  }

  protected getRawParty(): readonly RuntimePartyMember[] {
    const members = (
      getRuntimeWindow().Engine as NiEngine
    ).party?.getMembers?.();
    if (!members) return [];
    return [...members.values()].map((member) =>
      Object.freeze({
        accountId: String(member.accountId),
        characterId: String(member.id),
        currentHp: member.hp[0],
        icon: member.icon,
        isLeader: member.leader,
        maxHp: member.hp[1],
        name: member.nick,
        profession: member.profession,
      }),
    );
  }

  isReady(): boolean {
    return Boolean(
      getRuntimeWindow().Engine?.interface?.alreadyInitialised ||
      getRuntimeWindow().Engine?.interface?.getAlreadyInitialised?.(),
    );
  }
}

export class SiRuntimeAdapter extends BaseRuntimeAdapter {
  readonly interface = "si" as const;

  protected getRawGame() {
    const runtimeWindow = getRuntimeWindow();
    return {
      hero: runtimeWindow.hero,
      map: runtimeWindow.map,
      world: runtimeWindow.g.worldConfig.getWorldName(),
    };
  }

  protected getRawNpcs(): readonly GameNpc[] {
    return Object.values(getRuntimeWindow().g.npc ?? {});
  }

  protected getRawNpc(id: number): GameNpc | undefined {
    return getRuntimeWindow().g.npc?.[id];
  }

  protected getRawOthers(): Record<string, RuntimeOtherWrapper> {
    return (getRuntimeWindow().g.other ?? {}) as Record<
      string,
      RuntimeOtherWrapper
    >;
  }

  protected getRawOther(id: string): RuntimeOtherWrapper | undefined {
    return (getRuntimeWindow().g.other?.[id] ?? undefined) as
      | RuntimeOtherWrapper
      | undefined;
  }

  protected getRawParty(): readonly RuntimePartyMember[] {
    return [];
  }

  isReady(): boolean {
    return getRuntimeWindow().g?.init === 5;
  }
}

export function createRuntimeAdapter(): MargonemRuntimeAdapter {
  return typeof getRuntimeWindow().Engine === "object"
    ? new NiRuntimeAdapter()
    : new SiRuntimeAdapter();
}

export function getMargonemInterface(): MargonemInterface {
  return typeof getRuntimeWindow().Engine === "object" ? "ni" : "si";
}

export function isMargonemRuntimeReady(): boolean {
  try {
    return createRuntimeAdapter().isReady();
  } catch {
    return false;
  }
}
