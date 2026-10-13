import { useState } from "react";

/** A list position that starts over when the Organization's world changes. */
export const useWorldScopedCursor = (world: string | null) => {
  const [position, setPosition] = useState({ world, cursor: 0 });
  const cursor = position.world === world ? position.cursor : 0;

  const setCursor = (nextCursor: number) => {
    setPosition({ world, cursor: nextCursor });
  };

  return [cursor, setCursor] as const;
};
