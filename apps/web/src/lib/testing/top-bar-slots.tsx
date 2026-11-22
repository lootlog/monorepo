import type { ReactNode } from "react";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";

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
