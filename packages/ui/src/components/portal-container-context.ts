import { createContext, useContext } from "react";

export const PortalContainerContext = createContext<HTMLElement | undefined>(
  undefined,
);

export const usePortalContainer = () => useContext(PortalContainerContext);
