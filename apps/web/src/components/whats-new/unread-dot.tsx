import { cn } from "cn";

/** Marks something the player has not opened yet. */
export const UnreadDot = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn("size-2 shrink-0 rounded-full bg-primary", className)}
  />
);
