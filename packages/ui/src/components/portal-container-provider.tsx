import type { ReactNode } from "react";
import { PortalContainerContext } from "./portal-container-context";

interface PortalContainerProviderProps {
  children: ReactNode;
  container: HTMLElement | null;
}

export const PortalContainerProvider = ({
  children,
  container,
}: PortalContainerProviderProps) => (
  <PortalContainerContext.Provider value={container ?? undefined}>
    {children}
  </PortalContainerContext.Provider>
);
