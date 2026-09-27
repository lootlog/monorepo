import {
  getPresenceKey,
  type PlayerPresence,
  type PlayerPresenceResponse,
} from "./online-players-presence";

export type MapOccupant = { key: string; name: string; isAfk: boolean };

/** Who is on one map; the reference changes only when a name or AFK state does. */
export type MapOccupancy = {
  players: readonly MapOccupant[];
  allAfk: boolean;
};

const sameOccupancy = (first: MapOccupancy, second: MapOccupancy) =>
  first.players.length === second.players.length &&
  first.players.every((player, index) => {
    const other = second.players[index];

    return (
      other?.key === player.key &&
      other.name === player.name &&
      other.isAfk === player.isAfk
    );
  });

/** Character identity survives reconnects; session identity makes late removals safe. */
export class PresenceMapIndex {
  private readonly characters = new Map<string, PlayerPresence>();
  private readonly sessions = new Map<string, string>();
  private readonly maps = new Map<string, Map<string, PlayerPresence>>();
  private readonly occupancy = new Map<string, MapOccupancy>();

  getOccupancy(mapName: string): MapOccupancy | undefined {
    const cached = this.occupancy.get(mapName);

    if (cached) return cached;
    const characters = this.maps.get(mapName);

    if (!characters) return undefined;

    const players = [...characters]
      .map(([key, presence]) => ({
        key,
        name: presence.player?.name ?? "",
        isAfk: presence.isAfk,
      }))
      .sort(
        (first, second) =>
          first.name.localeCompare(second.name) ||
          first.key.localeCompare(second.key),
      );

    const occupancy = {
      players,
      allAfk: players.every((player) => player.isAfk),
    };

    this.occupancy.set(mapName, occupancy);

    return occupancy;
  }

  hasCharacter(characterId: string): boolean {
    for (const presence of this.characters.values()) {
      if (presence.player?.characterId === characterId) return true;
    }

    return false;
  }

  toPlayers(): PlayerPresenceResponse {
    const players: PlayerPresenceResponse = {};

    for (const presence of this.characters.values()) {
      (players[presence.discordId] ??= []).push(presence);
    }

    return players;
  }

  replace(players: PlayerPresenceResponse): void {
    const previous = new Map(
      [...this.maps.keys()].flatMap((mapName) => {
        const occupancy = this.getOccupancy(mapName);

        return occupancy ? [[mapName, occupancy] as const] : [];
      }),
    );

    this.characters.clear();
    this.sessions.clear();
    this.maps.clear();
    this.occupancy.clear();

    for (const presences of Object.values(players)) {
      for (const presence of presences) this.apply(presence);
    }

    // Keep unchanged references so a refresh does not wake every timer tile.
    for (const [mapName, occupancy] of previous) {
      const next = this.getOccupancy(mapName);

      if (next && sameOccupancy(occupancy, next))
        this.occupancy.set(mapName, occupancy);
    }
  }

  /** Returns the maps whose occupancy changed. */
  apply(presence: PlayerPresence): string[] {
    const key = `${presence.discordId}:${getPresenceKey(presence)}`;

    const identity =
      presence.status === "offline" && presence.sessionId
        ? this.sessions.get(presence.sessionId)
        : key;

    if (!identity) return [];
    const previous = this.characters.get(identity);

    if (presence.status === "offline") {
      if (!previous) return [];
      this.characters.delete(identity);

      if (previous.sessionId) this.sessions.delete(previous.sessionId);

      return this.leave(previous.mapName, identity);
    }

    if (!presence.player) return [];

    if (previous?.sessionId && previous.sessionId !== presence.sessionId) {
      this.sessions.delete(previous.sessionId);
    }

    this.characters.set(identity, presence);

    if (presence.sessionId) this.sessions.set(presence.sessionId, identity);

    if (previous && previous.mapName === presence.mapName) {
      if (!presence.mapName) return [];
      this.maps.get(presence.mapName)?.set(identity, presence);

      if (
        previous.isAfk === presence.isAfk &&
        previous.player?.name === presence.player.name
      )
        return [];
      this.occupancy.delete(presence.mapName);

      return [presence.mapName];
    }

    return [
      ...this.leave(previous?.mapName, identity),
      ...this.enter(presence.mapName, identity, presence),
    ];
  }

  private enter(
    mapName: string | undefined,
    identity: string,
    presence: PlayerPresence,
  ): string[] {
    if (!mapName) return [];
    let characters = this.maps.get(mapName);

    if (!characters) {
      characters = new Map();
      this.maps.set(mapName, characters);
    }

    characters.set(identity, presence);
    this.occupancy.delete(mapName);

    return [mapName];
  }

  private leave(mapName: string | undefined, identity: string): string[] {
    const characters = mapName ? this.maps.get(mapName) : undefined;

    if (!mapName || !characters?.delete(identity)) return [];

    if (characters.size === 0) this.maps.delete(mapName);
    this.occupancy.delete(mapName);

    return [mapName];
  }
}
