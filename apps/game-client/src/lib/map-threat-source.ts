import {
  AIR_TAG_MAP_THREAT_FRESH_MS,
  AIR_TAG_MAP_THREAT_TTL_MS,
  type AirTagMapThreatEnemy,
  type AirTagMapThreatEvent,
} from "@lootlog/schema/air-tag";
import {
  canReadPresenceLocation,
  type PlayerPresence,
} from "./online-players-presence";
import {
  getPlayersPresenceSource,
  type PlayersPresenceSource,
} from "./players-presence-source";
import { groupByToMap } from "./group-by-to-map";
import type { AppSocket } from "./socket";
import {
  createScopedSourceRegistry,
  KeyedListeners,
  SourceReferences,
} from "./scoped-source";

type Listener = () => void;

export type MapThreatEnemy = Omit<AirTagMapThreatEnemy, "ageMs"> & {
  /** Local clock time of the last clan-enemy sighting. */
  seenAt: number;
};

/** Clan enemies an Organization member saw on one map; stale once no sighting is fresh. */
export type MapThreat = {
  /** Fresh sightings first, then by nickname. */
  enemies: readonly MapThreatEnemy[];
  freshCount: number;
};

type MapSightings = {
  mapName: string;
  revision: number;
  enemies: readonly MapThreatEnemy[];
};

export const isMapThreatEnemyFresh = (enemy: MapThreatEnemy, now: number) =>
  now - enemy.seenAt < AIR_TAG_MAP_THREAT_FRESH_MS;

/**
 * One threat from sightings of several maps or Lootlogs: a target seen more
 * than once keeps its latest sighting.
 */
export function projectMapThreat(
  sightings: Iterable<MapThreatEnemy>,
  now: number,
): MapThreat {
  const latest = new Map<string, MapThreatEnemy>();

  for (const enemy of sightings) {
    const known = latest.get(enemy.targetId);

    if (!known || known.seenAt < enemy.seenAt)
      latest.set(enemy.targetId, enemy);
  }

  const enemies = [...latest.values()].sort(
    (first, second) =>
      Number(isMapThreatEnemyFresh(second, now)) -
        Number(isMapThreatEnemyFresh(first, now)) ||
      first.nickname.localeCompare(second.nickname),
  );

  return {
    enemies,
    freshCount: enemies.filter((enemy) => isMapThreatEnemyFresh(enemy, now))
      .length,
  };
}

const sameThreat = (first: MapThreat, second: MapThreat) =>
  first.freshCount === second.freshCount &&
  first.enemies.length === second.enemies.length &&
  first.enemies.every((enemy, index) => enemy === second.enemies[index]);

/** Map threats of one Organization and world, delivered by the gateway from members' AirTag sightings. */
export class MapThreatSource {
  private readonly sightings = new Map<number, MapSightings>();
  private readonly threats = new Map<string, MapThreat>();
  private readonly mapListeners = new KeyedListeners<string>();
  private readonly references = new SourceReferences(() => this.stop());
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private fetchId = 0;
  private readable = false;
  private releaseMembers: (() => void) | null = null;
  private membersChanged = false;

  constructor(
    private readonly socket: AppSocket,
    readonly guildId: string,
    readonly world: string,
    // Members of different Margonem clans can be each other's clan enemies.
    private readonly members: Pick<
      PlayersPresenceSource,
      "isOnlineMember" | "subscribeChanges"
    >,
    private readonly now: () => number = () => Date.now(),
  ) {}

  getMapThreat = (mapName: string): MapThreat | undefined =>
    this.threats.get(mapName);

  retain = (): (() => void) => {
    const release = this.references.retain();

    // A subscription replaced in the same commit keeps the running source and its snapshot.
    if (!this.active) this.start();

    return release;
  };

  subscribeMap = (mapName: string, listener: Listener): (() => void) =>
    this.mapListeners.add(mapName, listener);

  private canRead(): boolean {
    return (
      this.socket.connectionState === "ready" &&
      canReadPresenceLocation(
        this.socket
          .getAccessPolicy()
          ?.organizations.find(
            (organization) => organization.organizationId === this.guildId,
          ),
      )
    );
  }

  private start(): void {
    this.active = true;
    this.socket.on("air-tag.map-threat-updated", this.apply);
    this.socket.on("access.updated", this.handleAccessChange);
    this.socket.on("join", this.handleJoin);
    this.socket.on("disconnect", this.clear);
    this.releaseMembers = this.members.subscribeChanges(
      this.handleMembersChange,
      false,
    );
    this.readable = this.canRead();
    void this.hydrate();
  }

  private stop(): void {
    if (!this.active) return;
    this.active = false;
    this.socket.off("air-tag.map-threat-updated", this.apply);
    this.socket.off("access.updated", this.handleAccessChange);
    this.socket.off("join", this.handleJoin);
    this.socket.off("disconnect", this.clear);
    this.releaseMembers?.();
    this.releaseMembers = null;
    this.fetchId += 1;
    this.clear();
  }

  /** Threats seen before this client connected; later events win by revision. */
  private async hydrate(): Promise<void> {
    if (!this.canRead()) return;
    const fetchId = ++this.fetchId;

    try {
      const threats = await this.socket.fetchAirTagMapThreats(
        this.guildId,
        this.world,
      );

      if (fetchId !== this.fetchId) return;

      for (const threat of threats) this.apply(threat);
    } catch {
      // Live events still arrive; a failed snapshot only delays older sightings.
    }
  }

  // The realtime client decodes server events against the protocol schema.
  private readonly apply = (payload: AirTagMapThreatEvent): void => {
    if (
      payload.guildId !== this.guildId ||
      payload.world !== this.world ||
      !this.canRead()
    )
      return;
    const previous = this.sightings.get(payload.mapId);

    // Two gateway instances may deliver lists of one map out of order.
    if (previous && previous.revision >= payload.revision) return;
    const now = this.now();

    this.sightings.set(payload.mapId, {
      mapName: payload.mapName,
      revision: payload.revision,
      enemies: payload.enemies.map(({ ageMs, ...enemy }) => ({
        ...enemy,
        seenAt: now - ageMs,
      })),
    });
    this.update(
      previous ? [previous.mapName, payload.mapName] : [payload.mapName],
    );
  };

  private readonly handleJoin = (): void => {
    this.readable = this.canRead();
    void this.hydrate();
  };

  private readonly handleAccessChange = (): void => {
    const readable = this.canRead();

    if (!readable) this.clear();
    // Sightings stored before access was granted are not sent again.
    else if (!this.readable) void this.hydrate();

    this.readable = readable;
  };

  /** A target becomes a known member once presence loads; re-project once per burst. */
  private readonly handleMembersChange = (presence?: PlayerPresence): void => {
    if (this.membersChanged || this.sightings.size === 0) return;

    // Members move between maps all the time; an online update keyed by its
    // character changes only whether that character counts as a member. Any
    // other update may replace or close another character, so it re-projects.
    if (presence?.status === "online" && presence.player?.accountId) {
      const characterId = presence.player.characterId;

      if (characterId && !this.isSighted(characterId)) return;
    }

    this.membersChanged = true;
    queueMicrotask(() => {
      this.membersChanged = false;
      this.update(this.projectedMapNames());
    });
  };

  private isSighted(targetId: string): boolean {
    for (const { enemies } of this.sightings.values()) {
      if (enemies.some((enemy) => enemy.targetId === targetId)) return true;
    }

    return false;
  }

  private projectedMapNames(): string[] {
    return [
      ...this.threats.keys(),
      ...[...this.sightings.values()].map(({ mapName }) => mapName),
    ];
  }

  private readonly clear = (): void => {
    const mapNames = [...this.threats.keys()];
    this.sightings.clear();
    this.update(mapNames);
  };

  private update(mapNames: Iterable<string>): void {
    const now = this.now();
    const changed: string[] = [];

    for (const [mapId, sightings] of this.sightings) {
      const live = sightings.enemies.filter(
        (enemy) => now - enemy.seenAt < AIR_TAG_MAP_THREAT_TTL_MS,
      );

      if (live.length === 0) this.sightings.delete(mapId);
      else if (live.length !== sightings.enemies.length)
        this.sightings.set(mapId, { ...sightings, enemies: live });
    }

    const sightingsByMapName = groupByToMap(
      [...this.sightings.values()],
      (sightings) => sightings.mapName,
    );

    for (const mapName of new Set(mapNames)) {
      const next = this.project(sightingsByMapName.get(mapName) ?? [], now);
      const previous = this.threats.get(mapName);

      if (!previous && !next) continue;

      if (previous && next && sameThreat(previous, next)) continue;

      if (next) this.threats.set(mapName, next);
      else this.threats.delete(mapName);
      changed.push(mapName);
    }

    this.schedule(now);

    for (const mapName of changed) this.mapListeners.notify(mapName);
  }

  /** Several map ids may share a name; members are never a threat. */
  private project(
    mapSightings: readonly MapSightings[],
    now: number,
  ): MapThreat | undefined {
    const enemies = mapSightings
      .flatMap((sightings) => sightings.enemies)
      .filter((enemy) => !this.members.isOnlineMember(enemy.targetId));

    return enemies.length > 0 ? projectMapThreat(enemies, now) : undefined;
  }

  /** Wakes once at the next point where a sighting turns stale or expires. */
  private schedule(now: number): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    let next = Number.POSITIVE_INFINITY;

    for (const sightings of this.sightings.values()) {
      for (const { seenAt } of sightings.enemies) {
        const staleAt = seenAt + AIR_TAG_MAP_THREAT_FRESH_MS;
        next = Math.min(
          next,
          staleAt > now ? staleAt : seenAt + AIR_TAG_MAP_THREAT_TTL_MS,
        );
      }
    }

    if (next === Number.POSITIVE_INFINITY) return;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.update(this.projectedMapNames());
      },
      Math.max(0, next - now),
    );
  }
}

export const getMapThreatSource = createScopedSourceRegistry(
  (socket, guildId, world) =>
    new MapThreatSource(
      socket,
      guildId,
      world,
      getPlayersPresenceSource(socket, guildId, world),
    ),
);
