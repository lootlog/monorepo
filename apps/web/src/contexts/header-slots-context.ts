import { createContext } from "react";

/**
 * Top bar elements a page can render into: actions on the right, and the
 * context they apply to, such as the world, at the edge.
 */
export type HeaderSlots = {
  actions: HTMLElement | null;
  context: HTMLElement | null;
};

export const HeaderSlotsContext = createContext<HeaderSlots>({
  actions: null,
  context: null,
});
