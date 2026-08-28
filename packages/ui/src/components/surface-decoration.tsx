import {
  useSurfaceDecoration,
  type SurfaceDecorationSlot,
} from "./surface-decoration-context";

export const SurfaceDecoration = ({
  slot,
}: {
  slot: SurfaceDecorationSlot;
}) => {
  const Decoration = useSurfaceDecoration();
  return Decoration ? <Decoration slot={slot} /> : null;
};
