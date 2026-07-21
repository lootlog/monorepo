import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as React from "react";

import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      className={cn(
        "ll:overflow-hidden ll:origin-top",
        animationEffectsEnabled &&
          "data-[state=open]:ll:animate-in data-[state=open]:ll:fade-in-0 data-[state=open]:ll:zoom-in-95 data-[state=open]:ll:duration-150 data-[state=closed]:ll:animate-out data-[state=closed]:ll:fade-out-0 data-[state=closed]:ll:zoom-out-95 data-[state=closed]:ll:duration-100",
        className,
      )}
      {...props}
    >
      <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
});
CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName;

const CollapsibleRoot = CollapsiblePrimitive.Root;

export { CollapsibleRoot as Collapsible, CollapsibleContent };
