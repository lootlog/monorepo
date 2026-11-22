import { cn } from "cn";
import { useThemeMeta } from "@/themes/use-theme-meta";

export const RailItemIndicator = ({
  isActive,
  isLoading = false,
}: {
  isActive: boolean;
  isLoading?: boolean;
}) => {
  const { family } = useThemeMeta();

  if (family === "rukia") return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full transition-[height,opacity,background-color] duration-200 ease-emphasized",
        isActive &&
          isLoading &&
          "motion-safe:animate-pulse motion-safe:[animation-delay:300ms]",
        isActive
          ? "h-9 bg-primary"
          : "h-2 bg-muted-foreground opacity-0 group-hover/rail-item:h-5 group-hover/rail-item:opacity-100 group-has-[a:focus-visible]/rail-item:h-5 group-has-[a:focus-visible]/rail-item:opacity-100",
      )}
    />
  );
};
