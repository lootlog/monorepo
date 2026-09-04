import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";
import { cn } from "cn";
import { getLootlogPortalContainer } from "./theme-boundary";

const TooltipProviderContext = React.createContext(false);

type TooltipProviderProps = Omit<BaseTooltip.Provider.Props, "delay"> & {
  delayDuration?: number;
};

function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipProviderContext.Provider value>
      <BaseTooltip.Provider delay={delayDuration} {...props} />
    </TooltipProviderContext.Provider>
  );
}

function Tooltip(props: BaseTooltip.Root.Props) {
  const hasProvider = React.useContext(TooltipProviderContext);
  const tooltip = <BaseTooltip.Root disableHoverablePopup {...props} />;

  if (hasProvider) return tooltip;
  return <TooltipProvider>{tooltip}</TooltipProvider>;
}

type TooltipTriggerProps = Omit<BaseTooltip.Trigger.Props, "render"> & {
  asChild?: boolean;
};

function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        data-slot="tooltip-trigger"
        render={children}
        {...props}
      />
    );
  }

  return (
    <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props}>
      {children}
    </BaseTooltip.Trigger>
  );
}

type TooltipPositioningProps = Pick<
  BaseTooltip.Positioner.Props,
  | "align"
  | "alignOffset"
  | "collisionAvoidance"
  | "collisionBoundary"
  | "collisionPadding"
  | "side"
  | "sideOffset"
>;

type TooltipContentProps = BaseTooltip.Popup.Props & TooltipPositioningProps;

function TooltipContent({
  align,
  alignOffset,
  children,
  className,
  collisionAvoidance,
  collisionBoundary,
  collisionPadding = 8,
  side,
  sideOffset = 8,
  ...props
}: TooltipContentProps) {
  return (
    <BaseTooltip.Portal container={getLootlogPortalContainer()}>
      <BaseTooltip.Positioner
        align={align}
        alignOffset={alignOffset}
        className="ll:z-[500]"
        collisionAvoidance={collisionAvoidance}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          role="tooltip"
          className={cn(
            "ll:bg-black/80 ll:font-[arimo] ll:border ll:border-gray-400 ll:text-white ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2 ll:z-[500] ll:w-fit ll:origin-(--transform-origin) ll:rounded-sm ll:px-2 ll:py-1.5 ll:text-xs ll:text-balance",
            className,
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
