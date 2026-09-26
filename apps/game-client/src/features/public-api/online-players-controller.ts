import {
  getPlayersPresenceSource,
  type PlayersPresenceSource,
  type PlayersPresenceSnapshot,
} from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { mapOnlinePlayers } from "./mappers";
import type {
  PublicOnlinePlayersChangedEvent,
  PublicOnlinePlayersResult,
} from "@lootlog/game-client-api";

type TrackedScope = {
  source: PlayersPresenceSource;
  resultJson: string;
  unsubscribe?: () => void;
};

const requireNonEmptyString = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new TypeError(`${name} must be a non-empty string`);

  return value;
};

const resultFromSnapshot = (
  snapshot: PlayersPresenceSnapshot,
): PublicOnlinePlayersResult => {
  if (snapshot.accessState === "forbidden")
    return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };

  return {
    status: "success",
    players: mapOnlinePlayers(snapshot.onlinePlayers),
  };
};

export class PublicOnlinePlayersController {
  private readonly scopes = new Map<string, TrackedScope>();
  private active = false;
  private readonly socket: typeof getSocket;
  private readonly publish: (event: PublicOnlinePlayersChangedEvent) => void;

  constructor(dependencies: {
    getSocket?: typeof getSocket;
    publish: (event: PublicOnlinePlayersChangedEvent) => void;
  }) {
    this.socket = dependencies.getSocket ?? getSocket;
    this.publish = dependencies.publish;
  }

  async getOnlinePlayers(options: {
    guildId: string;
    world: string;
  }): Promise<PublicOnlinePlayersResult> {
    const guildId = requireNonEmptyString(options?.guildId, "guildId");
    const world = requireNonEmptyString(options?.world, "world");
    const { connected, joined } = useGlobalStore.getState().socketState;

    if (!connected || !joined)
      throw new Error("The gateway socket is not ready");
    const key = JSON.stringify([guildId, world]);
    let scope = this.scopes.get(key);

    if (!scope) {
      scope = {
        source: getPlayersPresenceSource(this.socket(), guildId, world),
        resultJson: "",
      };
      this.scopes.set(key, scope);

      if (this.active) this.subscribeScope(scope);
    }

    const release = scope.source.retain();

    try {
      const snapshot = await scope.source.refresh();

      if (snapshot.error) throw snapshot.error;
      const result = resultFromSnapshot(snapshot);
      scope.resultJson = JSON.stringify(result);

      return result;
    } finally {
      release();
    }
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    for (const scope of this.scopes.values()) this.subscribeScope(scope);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    for (const scope of this.scopes.values()) {
      scope.unsubscribe?.();
      scope.unsubscribe = undefined;
    }
  }

  teardown(): void {
    this.deactivate();
    this.scopes.clear();
  }

  private subscribeScope(scope: TrackedScope): void {
    scope.unsubscribe = scope.source.subscribeChanges((presence) => {
      const snapshot = presence
        ? scope.source.getCurrentSnapshot()
        : scope.source.getSnapshot();

      if (snapshot.refreshing || snapshot.error) return;
      const result = resultFromSnapshot(snapshot);
      const resultJson = JSON.stringify(result);

      if (resultJson === scope.resultJson) return;
      scope.resultJson = resultJson;
      this.publish({
        guildId: scope.source.guildId,
        world: scope.source.world,
        ...result,
      });
    });
    void scope.source.refresh();
  }
}
