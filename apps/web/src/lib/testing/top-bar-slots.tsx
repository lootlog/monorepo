import type { ReactNode } from "react";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";

/**
 * The app shell's top bar slots for a page rendered without its shell, so
 * actions a page portals into the bar, such as its filters, still render.
 * The slot elements live in the document, where screen queries find them.
 */
export const createTopBarSlots = () => {
  const actions = document.createElement("div");
  document.body.append(actions);

  const TopBarSlots = ({ children }: { children: ReactNode }) => (
    <HeaderSlotsContext.Provider
      value={{ title: null, actions, context: null }}
    >
      {children}
    </HeaderSlotsContext.Provider>
  );

  return { actions, TopBarSlots };
};
