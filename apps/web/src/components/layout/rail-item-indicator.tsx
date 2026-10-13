import { cn } from "cn";
import { useThemeMeta } from "@/themes";

/**
 * Marks the open rail entry at the rail's edge and previews the mark on hover
 * or keyboard focus. Place it inside a `group/rail-item` that spans the rail.
 */
export const RailItemIndicator = ({ isActive }: { isActive: boolean }) => {
  const { isRukiaTheme } = useThemeMeta();

  if (isRukiaTheme) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full transition-[height,opacity,background-color] duration-200 ease-emphasized",
        isActive
          ? "h-9 bg-primary"
          : "h-2 bg-muted-foreground opacity-0 group-hover/rail-item:h-5 group-hover/rail-item:opacity-100 group-has-[a:focus-visible]/rail-item:h-5 group-has-[a:focus-visible]/rail-item:opacity-100",
      )}
    />
  );
};
