import { cn } from "cn";

export const UnreadDot = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn("size-2 shrink-0 rounded-full bg-primary", className)}
  />
);
