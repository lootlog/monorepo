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
    const next = { ...this.handlesById };
    for (const id of batch.removeIds ?? []) delete next[id];
    Object.assign(next, batch.upserts);
    this.handlesById = Object.freeze(next);
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
