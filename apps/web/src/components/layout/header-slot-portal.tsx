import type { HeaderSlots } from "@/contexts/header-slots-context";
import { useHeaderSlot } from "@/hooks/context/use-header-slot";
import type { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

type HeaderSlotPortalProps = PropsWithChildren<{
  slot: keyof HeaderSlots;
}>;

export const HeaderSlotPortal: FC<HeaderSlotPortalProps> = ({
  slot,
  children,
}) => {
  const target = useHeaderSlot(slot);

  if (!target) {
    return null;
  }

  return createPortal(children, target);
};
