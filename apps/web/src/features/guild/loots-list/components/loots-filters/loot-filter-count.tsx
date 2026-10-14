import { cn } from "cn";

type LootFilterCountProps = {
  count: number;
  /** `corner` sits on the edge of an icon button, like a notification count. */
  variant?: "inline" | "corner";
  className?: string;
};

/** How many filters narrow the list, beside a title or on a button. */
export const LootFilterCount = ({
  count,
  variant = "inline",
  className,
}: LootFilterCountProps) => {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tabular-nums",
        variant === "inline" &&
          "h-5 min-w-5 bg-primary/15 px-1.5 text-[11px] text-primary",
        variant === "corner" &&
          "absolute -top-1 -right-1 h-4 min-w-4 animate-pop-in bg-primary px-1 text-[10px] text-primary-foreground ring-2 ring-background motion-reduce:animate-none",
        className,
      )}
    >
      {count}
    </span>
  );
};
