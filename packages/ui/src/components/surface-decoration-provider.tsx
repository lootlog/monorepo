import type { ReactNode } from "react";
import {
  SurfaceDecorationContext,
  type SurfaceDecorationRenderer,
} from "./surface-decoration-context";

interface SurfaceDecorationProviderProps {
  children: ReactNode;
  decoration: SurfaceDecorationRenderer | null;
}

export const SurfaceDecorationProvider = ({
  children,
  decoration,
}: SurfaceDecorationProviderProps) => (
  <SurfaceDecorationContext.Provider value={decoration}>
    {children}
  </SurfaceDecorationContext.Provider>
);
