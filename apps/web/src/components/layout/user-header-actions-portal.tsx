import { useUserHeaderActionsTarget } from "@/hooks/context/use-user-header-actions-target";
import type { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UserHeaderActionsPortal: FC<PropsWithChildren> = ({
  children,
}) => {
  const target = useUserHeaderActionsTarget();

  if (!target) {
    return null;
  }

  return createPortal(children, target);
};
