import { createContext } from "react";

/**
 * Top bar elements a page can render into: the current page's title in place
 * of its breadcrumb, actions on the right, and the context they apply to, such
 * as the world, at the edge.
 */
export type HeaderSlots = {
  title: HTMLElement | null;
  actions: HTMLElement | null;
  context: HTMLElement | null;
};

export const HeaderSlotsContext = createContext<HeaderSlots>({
  title: null,
  actions: null,
  context: null,
});
