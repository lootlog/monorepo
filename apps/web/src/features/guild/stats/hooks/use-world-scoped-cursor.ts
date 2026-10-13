import { useState } from "react";

/** A list position that starts over whenever the Organization's world changes. */
export const useWorldScopedCursor = (world: string | null) => {
  const [position, setPosition] = useState({ world, cursor: 0 });

  // Resetting while rendering forgets the old world's page, so coming back to
  // that world later starts from the top as well.
  if (position.world !== world) setPosition({ world, cursor: 0 });

  const cursor = position.world === world ? position.cursor : 0;

  const setCursor = (nextCursor: number) => {
    setPosition({ world, cursor: nextCursor });
  };

  return [cursor, setCursor] as const;
};
