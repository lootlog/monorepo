import type { OtherHandle } from "@lootlog/margonem/others";

type ResolveHandle = (id: string) => OtherHandle | undefined;

class RuntimeOtherHandleRegistry {
  private handlesById: Readonly<Record<string, OtherHandle>> = Object.freeze(
    {},
  );

  // SI queues `other` packets in its load queue and creates the player on a
  // later game thread tick, so a player can be projected before its handle exists.
  private readonly pendingIds = new Set<string>();
  private resolveHandle: ResolveHandle | null = null;

  replace(
    handlesById: Readonly<Record<string, OtherHandle>>,
    pending?: { ids: readonly string[]; resolve: ResolveHandle },
  ): void {
    this.handlesById = Object.freeze({ ...handlesById });
    this.pendingIds.clear();
    this.addPending(pending);
  }

  applyBatch(batch: {
    removeIds?: readonly string[];
    upserts?: Readonly<Record<string, OtherHandle>>;
    pending?: { ids: readonly string[]; resolve: ResolveHandle };
  }): void {
    let writableHandlesById: Record<string, OtherHandle> | null = null;

    const getWritableHandlesById = () => {
      writableHandlesById ??= { ...this.handlesById };

      return writableHandlesById;
    };

    for (const id of batch.removeIds ?? []) {
      this.pendingIds.delete(id);

      if (!(id in this.handlesById)) continue;
      delete getWritableHandlesById()[id];
    }

    for (const [id, handle] of Object.entries(batch.upserts ?? {})) {
      this.pendingIds.delete(id);
      const currentHandle = (writableHandlesById ?? this.handlesById)[id];

      if (currentHandle === handle) continue;
      getWritableHandlesById()[id] = handle;
    }

    if (writableHandlesById) {
      this.handlesById = Object.freeze(writableHandlesById);
    }

    this.addPending(batch.pending);
  }

  get(id: string): OtherHandle | undefined {
    if (this.pendingIds.has(id)) this.resolvePending();

    return this.handlesById[id];
  }

  getAll(): Readonly<Record<string, OtherHandle>> {
    if (this.pendingIds.size > 0) this.resolvePending();

    return this.handlesById;
  }

  clear(): void {
    this.handlesById = Object.freeze({});
    this.pendingIds.clear();
    this.resolveHandle = null;
  }

  private addPending(
    pending: { ids: readonly string[]; resolve: ResolveHandle } | undefined,
  ): void {
    if (!pending || pending.ids.length === 0) return;

    this.resolveHandle = pending.resolve;

    for (const id of pending.ids) {
      if (!(id in this.handlesById)) this.pendingIds.add(id);
    }
  }

  private resolvePending(): void {
    const resolve = this.resolveHandle;

    if (!resolve) return;
    const upserts: Record<string, OtherHandle> = {};

    for (const id of this.pendingIds) {
      try {
        const handle = resolve(id);

        if (handle) upserts[id] = handle;
      } catch {
        // Native state may be unavailable while Margonem loads a map.
      }
    }

    if (Object.keys(upserts).length > 0) this.applyBatch({ upserts });
  }
}

export const runtimeOtherHandles = new RuntimeOtherHandleRegistry();
