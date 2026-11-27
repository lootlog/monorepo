import { createContext, useContext, type ReactNode } from "react";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";

type MobilePanelNavRenderer = (activePanel: MobilePanelWindowId) => ReactNode;

export const MobilePanelNavContext =
  createContext<MobilePanelNavRenderer | null>(null);

export const useMobilePanelNav = (
  activePanel: MobilePanelWindowId,
): ReactNode => {
  const renderNav = useContext(MobilePanelNavContext);

  return renderNav ? renderNav(activePanel) : null;
};
