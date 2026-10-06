import type {
  NpcPresenceEvent,
  NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import { GatewayEvent } from "@/config/gateway";
import type { AppSocket } from "./socket";

type Listener = () => void;

const sources = new WeakMap<AppSocket, Map<string, NpcPresenceSource>>();

export function getNpcPresenceSource(
  socket: AppSocket,
  guildId: string,
  world: string,
): NpcPresenceSource {
  let scopes = sources.get(socket);

  if (!scopes) {
    scopes = new Map();
    sources.set(socket, scopes);
  }

  const key = JSON.stringify([guildId, world]);
  let source = scopes.get(key);

  if (!source) {
    source = new NpcPresenceSource(socket, guildId, world);
    scopes.set(key, source);
  }

  return source;
}

/** Timer NPCs that members of one Organization see standing in one world. */
export class NpcPresenceSource {
  /** Gateway time each standing NPC was first reported, by runtime NPC id. */
  private readonly standing = new Map<number, number>();
  /** Revisions of updates newer than the snapshot, by runtime NPC id. */
  private readonly revisions = new Map<number, number>();
  private readonly npcListeners = new Map<number, Set<Listener>>();
  private snapshotRevision = 0;
  private references = 0;
  private active = false;
  private fetchId = 0;

  constructor(
    private readonly socket: AppSocket,
    readonly guildId: string,
    readonly world: string,
  ) {}

  /** When the NPC was first reported standing, or undefined when it is not. */
  getStandingSince = (npcId: number): number | undefined =>
    this.standing.get(npcId);

  retain = (): (() => void) => {
    this.references += 1;

    if (!this.active) this.start();
    let retained = true;

    return () => {
      if (!retained) return;
      retained = false;
      this.references -= 1;
      // React may replace a subscription during the same commit.
      queueMicrotask(() => {
        if (this.references === 0) this.stop();
      });
    };
  };

  subscribeNpc = (npcId: number, listener: Listener): (() => void) => {
    let listeners = this.npcListeners.get(npcId);

    if (!listeners) {
      listeners = new Set();
      this.npcListeners.set(npcId, listeners);
    }

    listeners.add(listener);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) this.npcListeners.delete(npcId);
    };
  };

  private start(): void {
    this.active = true;
    this.socket.on(GatewayEvent.NPC_PRESENCE_UPDATE, this.apply);
    this.socket.on(GatewayEvent.JOIN, this.handleJoin);
    this.socket.on(GatewayEvent.PERMISSIONS_UPDATED, this.hydrate);
    this.socket.on(GatewayEvent.DISCONNECT, this.clear);
    void this.hydrate();
  }

  private stop(): void {
    if (!this.active) return;
    this.active = false;
    this.socket.off(GatewayEvent.NPC_PRESENCE_UPDATE, this.apply);
    this.socket.off(GatewayEvent.JOIN, this.handleJoin);
    this.socket.off(GatewayEvent.PERMISSIONS_UPDATED, this.hydrate);
    this.socket.off(GatewayEvent.DISCONNECT, this.clear);
    this.fetchId += 1;
    this.clear();
  }

  private readonly handleJoin = (payload: { status: string }): void => {
    if (payload.status === "success") void this.hydrate();
  };

  /** NPCs reported before this client connected; newer updates keep their own state. */
  private readonly hydrate = async (): Promise<void> => {
    if (this.socket.connectionState !== "ready") return;
    const fetchId = ++this.fetchId;
    let snapshot: NpcPresenceSnapshot | null;

    try {
      snapshot = await this.socket.fetchNpcPresence(this.guildId, this.world);
    } catch {
      // Access was revoked or the gateway is unavailable; nothing is known to stand.
      snapshot = { revision: 0, npcs: [] };
    }

    if (fetchId !== this.fetchId || !snapshot) return;

    const next = new Map(
      snapshot.npcs.map(({ npc, since }) => [npc.id, since]),
    );

    for (const [npcId, revision] of this.revisions) {
      if (revision <= snapshot.revision) continue;
      const since = this.standing.get(npcId);

      if (since === undefined) next.delete(npcId);
      else next.set(npcId, since);
    }

    this.snapshotRevision = snapshot.revision;

    // Updates newer than the snapshot still guard their NPC against older ones.
    for (const [npcId, revision] of this.revisions) {
      if (revision <= snapshot.revision) this.revisions.delete(npcId);
    }

    this.replace(next);
  };

  // The realtime client decodes server events against the protocol schema.
  private readonly apply = (event: NpcPresenceEvent): void => {
    if (event.organizationId !== this.guildId || event.world !== this.world)
      return;
    const npcId = event.npc.id;

    // Two gateway replicas may deliver updates of one world out of order.
    if (
      event.revision <=
      Math.max(this.snapshotRevision, this.revisions.get(npcId) ?? 0)
    )
      return;
    this.revisions.set(npcId, event.revision);

    if (event.standing) this.standing.set(npcId, event.since);
    else this.standing.delete(npcId);
    this.notify([npcId]);
  };

  private readonly clear = (): void => {
    this.revisions.clear();
    this.snapshotRevision = 0;
    this.replace(new Map());
  };

  private replace(next: Map<number, number>): void {
    const changed = [...this.standing.keys(), ...next.keys()].filter(
      (npcId) => this.standing.get(npcId) !== next.get(npcId),
    );

    this.standing.clear();

    for (const [npcId, since] of next) this.standing.set(npcId, since);
    this.notify(new Set(changed));
  }

  private notify(npcIds: Iterable<number>): void {
    for (const npcId of npcIds) {
      for (const listener of this.npcListeners.get(npcId) ?? []) listener();
    }
  }
}
