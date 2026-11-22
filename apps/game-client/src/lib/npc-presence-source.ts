import type {
  NpcPresenceEvent,
  NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import type { AppSocket } from "./socket";
import {
  createScopedSourceRegistry,
  KeyedListeners,
  SourceReferences,
} from "./scoped-source";

type Listener = () => void;

export type NpcStanding = { readonly since: number; readonly map?: string };

const sameStanding = (
  first: NpcStanding | undefined,
  second: NpcStanding | undefined,
) => first?.since === second?.since && first?.map === second?.map;

const toStanding = ({
  since,
  map,
}: {
  since: number;
  map?: string;
}): NpcStanding => (map === undefined ? { since } : { since, map });

export class NpcPresenceSource {
  private readonly standing = new Map<number, NpcStanding>();
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

  getStanding = (npcId: number): NpcStanding | undefined =>
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
    this.socket.on("npc-presence.updated", this.apply);
    this.socket.on("join", this.handleJoin);
    this.socket.on("access.updated", this.hydrate);
    this.socket.on("disconnect", this.clear);
    void this.hydrate();
  }

  private stop(): void {
    if (!this.active) return;
    this.active = false;
    this.socket.off("npc-presence.updated", this.apply);
    this.socket.off("join", this.handleJoin);
    this.socket.off("access.updated", this.hydrate);
    this.socket.off("disconnect", this.clear);
    this.fetchId += 1;
    this.clear();
  }

  private readonly handleJoin = (): void => {
    void this.hydrate();
  };

  private readonly hydrate = async (): Promise<void> => {
    if (this.socket.connectionState !== "ready") return;
    const fetchId = ++this.fetchId;
    let snapshot: NpcPresenceSnapshot;

    try {
      snapshot = await this.socket.fetchNpcPresence(this.guildId, this.world);
    } catch {
      snapshot = { revision: 0, npcs: [] };
    }

    if (fetchId !== this.fetchId) return;

    const next = new Map(
      snapshot.npcs.map((record) => [record.npc.id, toStanding(record)]),
    );

    for (const [npcId, revision] of this.revisions) {
      if (revision <= snapshot.revision) continue;
      const standing = this.standing.get(npcId);

      if (standing === undefined) next.delete(npcId);
      else next.set(npcId, standing);
    }

    this.snapshotRevision = snapshot.revision;

    for (const [npcId, revision] of this.revisions) {
      if (revision <= snapshot.revision) this.revisions.delete(npcId);
    }

    this.replace(next);
  };

  private readonly apply = (event: NpcPresenceEvent): void => {
    if (event.organizationId !== this.guildId || event.world !== this.world)
      return;
    const npcId = event.npc.id;

    if (
      event.revision <=
      Math.max(this.snapshotRevision, this.revisions.get(npcId) ?? 0)
    )
      return;
    this.revisions.set(npcId, event.revision);

    if (event.standing) this.standing.set(npcId, toStanding(event));
    else this.standing.delete(npcId);
    this.notify([npcId]);
  };

  private readonly clear = (): void => {
    this.revisions.clear();
    this.snapshotRevision = 0;
    this.replace(new Map());
  };

  private replace(next: Map<number, NpcStanding>): void {
    const changed = [...this.standing.keys(), ...next.keys()].filter(
      (npcId) => !sameStanding(this.standing.get(npcId), next.get(npcId)),
    );

    for (const npcId of next.keys()) {
      const current = this.standing.get(npcId);

      if (current && sameStanding(current, next.get(npcId)))
        next.set(npcId, current);
    }

    this.standing.clear();

    for (const [npcId, standing] of next) this.standing.set(npcId, standing);
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
