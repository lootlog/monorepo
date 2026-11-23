import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import * as React from "react";
import { cn } from "cn";
import { useAnimationEffects } from "@/hooks/use-animation-effects";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  BaseCollapsible.Panel.Props
>(({ className, children, ...props }, ref) => {
  const animationEffectsEnabled = useAnimationEffects();

  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={cn(
        "ll:overflow-hidden ll:origin-top",
        animationEffectsEnabled &&
          "ll:animate-in ll:fade-in-0 ll:zoom-in-95 ll:duration-150 ll:data-[ending-style]:animate-out ll:data-[ending-style]:fade-out-0 ll:data-[ending-style]:zoom-out-95 ll:data-[ending-style]:duration-100",
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

const CollapsibleTrigger = BaseCollapsible.Trigger;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
