import {
  getPresenceKey,
  type PlayerPresence,
  type PlayerPresenceResponse,
} from "./online-players-presence";

/** Character identity survives reconnects; session identity makes late removals safe. */
export class PresenceMapIndex {
  private readonly characters = new Map<string, PlayerPresence>();
  private readonly sessions = new Map<string, string>();
  private readonly counts = new Map<string, number>();

  has(mapName: string): boolean {
    return (this.counts.get(mapName) ?? 0) > 0;
  }

  toPlayers(): PlayerPresenceResponse {
    const players: PlayerPresenceResponse = {};

    for (const presence of this.characters.values()) {
      (players[presence.discordId] ??= []).push(presence);
    }

    return players;
  }

  replace(players: PlayerPresenceResponse): void {
    this.characters.clear();
    this.sessions.clear();
    this.counts.clear();

    for (const presences of Object.values(players)) {
      for (const presence of presences) this.apply(presence);
    }
  }

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

      return this.adjust(previous.mapName, -1);
    }

    if (!presence.player) return [];

    if (previous?.sessionId && previous.sessionId !== presence.sessionId) {
      this.sessions.delete(previous.sessionId);
    }

    this.characters.set(identity, presence);

    if (presence.sessionId) this.sessions.set(presence.sessionId, identity);

    if (previous?.mapName === presence.mapName) return [];

    return [
      ...this.adjust(previous?.mapName, -1),
      ...this.adjust(presence.mapName, 1),
    ];
  }

  private adjust(mapName: string | undefined, delta: number): string[] {
    if (!mapName) return [];
    const previous = this.counts.get(mapName) ?? 0;
    const next = Math.max(0, previous + delta);

    if (next === 0) this.counts.delete(mapName);
    else this.counts.set(mapName, next);

    return (previous === 0) !== (next === 0) ? [mapName] : [];
  }
}
