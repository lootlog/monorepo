import { createContext } from "react";

/** Top bar elements a page can render into: next to the title, or at the end. */
export type HeaderSlots = {
  context: HTMLElement | null;
  actions: HTMLElement | null;
};

export const HeaderSlotsContext = createContext<HeaderSlots>({
  context: null,
  actions: null,
});
