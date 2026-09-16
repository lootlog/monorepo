import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";
import { cn } from "cn";
import type { CursorTooltipOffsets } from "./cursor-tooltip-placement";
import {
  ensureCursorTracking,
  getCursorPoint,
  registerCursorFollower,
} from "./cursor-follower";
import { getLootlogPortalContainer } from "./theme-boundary";

const TooltipProviderContext = React.createContext(false);

/** Whether the current open was started by hovering, so the popup follows the cursor. */
const TooltipFollowsCursorContext = React.createContext(false);

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

function Tooltip({ onOpenChange, ...props }: BaseTooltip.Root.Props) {
  const hasProvider = React.useContext(TooltipProviderContext);
  const [followsCursor, setFollowsCursor] = React.useState(false);

  const tooltip = (
    <TooltipFollowsCursorContext.Provider value={followsCursor}>
      <BaseTooltip.Root
        disableHoverablePopup
        onOpenChange={(open, details) => {
          if (open) setFollowsCursor(details.reason === "trigger-hover");
          onOpenChange?.(open, details);
        }}
        {...props}
      />
    </TooltipFollowsCursorContext.Provider>
  );

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

const CURSOR_OFFSETS: CursorTooltipOffsets = {
  sideOffset: 14,
  alignOffset: 6,
  padding: 8,
};

/** Anchor for Base UI's own (initial, resize, scroll) positioning: the pointer. */
const getCursorAnchor = () => {
  const cursor = getCursorPoint();

  if (!cursor) return null;

  const { x, y } = cursor;

  return {
    getBoundingClientRect: () => ({
      x,
      y,
      top: y,
      left: x,
      right: x,
      bottom: y,
      width: 0,
      height: 0,
    }),
  };
};

type TooltipPositioningProps = Pick<
  BaseTooltip.Positioner.Props,
  "collisionBoundary"
> & {
  collisionPadding?: number;
  sideOffset?: number;
};

type TooltipContentProps = BaseTooltip.Popup.Props & TooltipPositioningProps;

function TooltipContent({
  children,
  className,
  collisionBoundary,
  collisionPadding = CURSOR_OFFSETS.padding,
  sideOffset = CURSOR_OFFSETS.sideOffset,
  ...props
}: TooltipContentProps) {
  const followsCursor = React.useContext(TooltipFollowsCursorContext);
  ensureCursorTracking();

  const offsets: CursorTooltipOffsets = {
    ...CURSOR_OFFSETS,
    sideOffset,
    padding: collisionPadding,
  };

  const registerFollower = (element: HTMLDivElement | null) => {
    if (!element || !followsCursor) return undefined;

    return registerCursorFollower(element, offsets);
  };

  return (
    <BaseTooltip.Portal container={getLootlogPortalContainer()}>
      <BaseTooltip.Positioner
        align="end"
        alignOffset={CURSOR_OFFSETS.alignOffset}
        anchor={followsCursor ? getCursorAnchor : undefined}
        className="ll:z-[500]"
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        ref={registerFollower}
        side="bottom"
        sideOffset={sideOffset}
      >
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          role="tooltip"
          className={cn(
            "ll:bg-black ll:border ll:border-white/50 ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:text-popover-foreground ll:z-[500] ll:w-fit ll:max-w-64 ll:rounded-md ll:px-2.5 ll:py-1.5 ll:text-xs ll:leading-4 ll:text-balance",
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
