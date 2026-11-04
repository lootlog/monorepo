import type {
  NpcPresenceEvent,
  NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import { GatewayEvent } from "@/config/gateway";
import type { AppSocket } from "./socket";
import {
  createScopedSourceRegistry,
  KeyedListeners,
  SourceReferences,
} from "./scoped-source";

type Listener = () => void;

/** Timer NPCs that members of one Organization see standing in one world. */
export class NpcPresenceSource {
  /** Gateway time each standing NPC was first reported, by runtime NPC id. */
  private readonly standing = new Map<number, number>();
  /** Revisions of updates newer than the snapshot, by runtime NPC id. */
  private readonly revisions = new Map<number, number>();
  private readonly npcListeners = new KeyedListeners<number>();
  private readonly references = new SourceReferences(() => this.stop());
  private snapshotRevision = 0;
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
    const release = this.references.retain();

    if (!this.active) this.start();

    return release;
  };

  subscribeNpc = (npcId: number, listener: Listener): (() => void) =>
    this.npcListeners.add(npcId, listener);

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
    let snapshot: NpcPresenceSnapshot;

    try {
      snapshot = await this.socket.fetchNpcPresence(this.guildId, this.world);
    } catch {
      // Access was revoked or the gateway is unavailable; nothing is known to stand.
      snapshot = { revision: 0, npcs: [] };
    }

    if (fetchId !== this.fetchId) return;

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
      this.npcListeners.notify(npcId);
    }
  }
}

export const getNpcPresenceSource = createScopedSourceRegistry(
  (socket, guildId, world) => new NpcPresenceSource(socket, guildId, world),
);
