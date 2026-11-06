import { cn } from "cn";

/** The wiki's app icon, the same drawing as its favicon. */
export function WikiMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
}
