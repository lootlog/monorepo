import { createContext } from "react";

/**
 * Shell bar elements a page can render into: in the top bar, the current
 * page's title in place of its breadcrumb, actions on the right, and the
 * context they apply to, such as the world, at the edge; on phones, the tab
 * bar's accessory, such as the page's filters.
 */
export type HeaderSlots = {
  title: HTMLElement | null;
  actions: HTMLElement | null;
  context: HTMLElement | null;
  /** Hidden from `md` up with the tab bar; read it with `useTabBarAccessory`. */
  accessory: HTMLElement | null;
};

export const HeaderSlotsContext = createContext<HeaderSlots>({
  title: null,
  actions: null,
  context: null,
  accessory: null,
});
