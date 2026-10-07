const MAX_RECENT_WORLDS = 3;

/** The recently picked worlds after picking `world`, newest first. */
export const addRecentWorld = (
  recent: ReadonlyArray<string>,
  world: string,
): string[] =>
  [world, ...recent.filter((other) => other !== world)].slice(
    0,
    MAX_RECENT_WORLDS,
  );
