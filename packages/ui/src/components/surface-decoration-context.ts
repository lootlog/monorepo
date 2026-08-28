import { createContext, useContext, type ComponentType } from "react";

export type SurfaceDecorationSlot = "card" | "dialog";
export type SurfaceDecorationRenderer = ComponentType<{
  slot: SurfaceDecorationSlot;
}>;

export const SurfaceDecorationContext =
  createContext<SurfaceDecorationRenderer | null>(null);

export const useSurfaceDecoration = () => useContext(SurfaceDecorationContext);
