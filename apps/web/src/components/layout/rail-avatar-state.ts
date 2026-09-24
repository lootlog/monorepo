import { cn } from "cn";

/**
 * Rail avatars carry their state in the picture itself: the active one is in
 * full colour, the rest are greyed and brighten back on hover or focus.
 */
export const railAvatarStateClassName = (isActive: boolean) =>
  cn(
    "transition-[opacity,filter] duration-200 motion-reduce:transition-none",
    !isActive &&
      "opacity-70 grayscale group-hover/rail-item:opacity-100 group-hover/rail-item:grayscale-0 group-focus-visible/rail-item:opacity-100 group-focus-visible/rail-item:grayscale-0",
  );
