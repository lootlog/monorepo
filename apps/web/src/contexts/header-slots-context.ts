import { createContext } from "react";

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
