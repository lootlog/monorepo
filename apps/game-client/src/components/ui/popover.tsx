import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { cn } from "@/lib/utils";
import { getLootlogPortalContainer } from "./theme-boundary";

function Popover(props: BasePopover.Root.Props) {
  return <BasePopover.Root {...props} />;
}

type PopoverTriggerProps = Omit<BasePopover.Trigger.Props, "render"> & {
  asChild?: boolean;
};

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <BasePopover.Trigger
        data-slot="popover-trigger"
        render={children}
        {...props}
      />
    );
  }

  return (
    <BasePopover.Trigger data-slot="popover-trigger" {...props}>
      {children}
    </BasePopover.Trigger>
  );
}

type PopoverPositioningProps = Pick<
  BasePopover.Positioner.Props,
  | "align"
  | "alignOffset"
  | "anchor"
  | "collisionAvoidance"
  | "collisionBoundary"
  | "collisionPadding"
  | "side"
  | "sideOffset"
>;

type PopoverContentProps = BasePopover.Popup.Props & PopoverPositioningProps;

function PopoverContent({
  align = "center",
  alignOffset,
  anchor,
  children,
  className,
  collisionAvoidance,
  collisionBoundary,
  collisionPadding = 8,
  side,
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  return (
    <BasePopover.Portal container={getLootlogPortalContainer()}>
      <BasePopover.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="ll:z-[500]"
        collisionAvoidance={collisionAvoidance}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "ll:bg-black ll:border ll:border-gray-400 ll:text-white ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2 ll:z-[500] ll:origin-(--transform-origin) ll:rounded-sm ll:p-2 ll:shadow-md ll:outline-hidden",
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
