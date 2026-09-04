import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import * as React from "react";
import { cn } from "cn";
import { useSettingsStore } from "@/store/settings.store";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  BaseCollapsible.Panel.Props
>(({ className, children, ...props }, ref) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={cn(
        "ll:overflow-hidden ll:origin-top",
        animationEffectsEnabled &&
          "data-[starting-style]:ll:animate-in data-[starting-style]:ll:fade-in-0 data-[starting-style]:ll:zoom-in-95 data-[starting-style]:ll:duration-150 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[ending-style]:ll:duration-100",
        className,
      )}
      {...props}
    >
      <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
    </BaseCollapsible.Panel>
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

const Collapsible = BaseCollapsible.Root;

export { Collapsible, CollapsibleContent };
