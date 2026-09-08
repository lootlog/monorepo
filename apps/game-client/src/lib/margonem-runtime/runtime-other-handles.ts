import type { OtherHandle } from "@lootlog/margonem/others";

class RuntimeOtherHandleRegistry {
  private handlesById: Readonly<Record<string, OtherHandle>> = Object.freeze(
    {},
  );

  replace(handlesById: Readonly<Record<string, OtherHandle>>): void {
    this.handlesById = Object.freeze({ ...handlesById });
  }

  applyBatch(batch: {
    removeIds?: readonly string[];
    upserts?: Readonly<Record<string, OtherHandle>>;
  }): void {
    let writableHandlesById: Record<string, OtherHandle> | null = null;
    const getWritableHandlesById = () => {
      writableHandlesById ??= { ...this.handlesById };
      return writableHandlesById;
    };

    for (const id of batch.removeIds ?? []) {
      if (!(id in this.handlesById)) continue;
      delete getWritableHandlesById()[id];
    }
    for (const [id, handle] of Object.entries(batch.upserts ?? {})) {
      const currentHandle = (writableHandlesById ?? this.handlesById)[id];
      if (currentHandle === handle) continue;
      getWritableHandlesById()[id] = handle;
    }

    if (writableHandlesById) {
      this.handlesById = Object.freeze(writableHandlesById);
    }
  }

  get(id: string): OtherHandle | undefined {
    return this.handlesById[id];
  }

  getAll(): Readonly<Record<string, OtherHandle>> {
    return this.handlesById;
  }

  clear(): void {
    this.handlesById = Object.freeze({});
  }
}

export const runtimeOtherHandles = new RuntimeOtherHandleRegistry();
