import type { ServerEvent } from "@lootlog/protocol/realtime";

type AirTagScopeUpdatedFrame = Extract<
  ServerEvent,
  { type: "air-tag.scope-updated" }
>;

/**
 * One `air-tag.updated` per target, for game clients that predate
 * `air-tag.scope-updated`. Built on delivery so a batch crosses Redis once;
 * these clients cannot see removals and let a target expire instead.
 */
export const toLegacyAirTagUpdates = (
  frame: AirTagScopeUpdatedFrame,
): ServerEvent[] => {
  const { targets, removedTargetIds: _, revision, ...scope } = frame.data;

  return targets.map((target, index) => {
    const targetRevision = revision - (targets.length - 1 - index);

    return {
      v: 1,
      type: "air-tag.updated",
      sequence: targetRevision,
      data: { ...scope, revision: targetRevision, target },
    };
  });
};
