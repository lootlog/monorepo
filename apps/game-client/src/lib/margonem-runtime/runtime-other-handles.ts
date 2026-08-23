import type { Other } from "@lootlog/margonem/others";

class RuntimeOtherHandleRegistry {
  private handlesById: Readonly<Record<string, Other>> = Object.freeze({});

  replace(handlesById: Readonly<Record<string, Other>>): void {
    this.handlesById = Object.freeze({ ...handlesById });
  }

  applyBatch(batch: {
    removeIds?: readonly string[];
    upserts?: Readonly<Record<string, Other>>;
  }): void {
    let writableHandlesById: Record<string, Other> | null = null;
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

  get(id: string): Other | undefined {
    return this.handlesById[id];
  }

  getAll(): Readonly<Record<string, Other>> {
    return this.handlesById;
  }

  clear(): void {
    this.handlesById = Object.freeze({});
  }
}

export const runtimeOtherHandles = new RuntimeOtherHandleRegistry();

export function replaceRuntimeOtherHandlesForCompatibility(
  handlesById: Readonly<Record<string, unknown>>,
): void {
  runtimeOtherHandles.replace(handlesById as Readonly<Record<string, Other>>);
}

export function upsertRuntimeOtherHandleForCompatibility(
  id: string,
  handle: unknown,
): void {
  runtimeOtherHandles.applyBatch({ upserts: { [id]: handle as Other } });
}
