import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import type { ComponentProps } from "react";
import { cn } from "cn";
import { GLASS_SURFACE_CLASS } from "@lootlog/ui/lib/glass-surface";

/**
 * Related top bar controls. Phones float each group as one glass capsule
 * over the page, with borderless round buttons inside it; wider bars set the
 * controls side by side.
 */
export const TopBarItemGroup = ({
  className,
  ...props
}: ComponentProps<"div">) => {
  const isMobile = useIsMobile();

  return (
    <div
      {...props}
      className={cn(
        "flex items-center",
        isMobile
          ? cn(GLASS_SURFACE_CLASS, "p-px [&_button]:rounded-full")
          : "gap-1",
        className,
      )}
    />
  );
};
