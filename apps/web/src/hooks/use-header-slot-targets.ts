import { useState } from "react";
import type { HeaderSlots } from "@/contexts/header-slots-context";

export const useHeaderSlotTargets = () => {
  const [title, setTitle] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [context, setContext] = useState<HTMLElement | null>(null);

  const slots: HeaderSlots = { title, actions, context };

  return {
    slots,
    titleRef: setTitle,
    actionsRef: setActions,
    contextRef: setContext,
  };
};
