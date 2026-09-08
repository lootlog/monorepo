import { createHash } from "node:crypto";

/** A retry has an exact identity; timing proximity never identifies a fight. */
export const buildGroupFightKey = (input: {
  readonly world: string;
  readonly map: { readonly id: number };
  readonly endedAt: string;
  readonly participants: ReadonlyArray<{ readonly characterId: string }>;
}): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        input.world,
        input.map.id,
        new Date(input.endedAt).toISOString(),
        input.participants.map((p) => p.characterId).sort(),
      ]),
    )
    .digest("hex");
