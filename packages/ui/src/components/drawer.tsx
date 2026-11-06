"use client";

import { useAnimatedHeight } from "@lootlog/ui/hooks/use-animated-height";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";

import { cn } from "cn";

type DrawerContextValue = {
  modal: DrawerPrimitive.Root.Props["modal"];
  /** Set on a resizable drawer: opens it to its full height. */
  expand: (() => void) | null;
  showSwipeHandle: boolean;
  swipeDirection: NonNullable<DrawerPrimitive.Root.Props["swipeDirection"]>;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawer() {
  const context = React.useContext(DrawerContext);

  if (!context) throw new Error("useDrawer must be used within a Drawer.");

  return context;
}

/** A resizable drawer's medium detent, as a share of the screen height. */
const MEDIUM_DETENT = 0.5;

/** Its large detent: the drawer's full height. */
const LARGE_DETENT = 1;

type DrawerProps = DrawerPrimitive.Root.Props & {
  showSwipeHandle?: boolean;
  /**
   * Opens the drawer at half the screen, over the page it came from, and lets
   * people drag it to its full height. Moving keyboard focus into the content
   * opens it fully too, so nothing stays out of reach without a gesture.
   */
  resizable?: boolean;
};

function Drawer({
  modal = true,
  showSwipeHandle = true,
  swipeDirection = "down",
  resizable = false,
  onOpenChangeComplete,
  ...props
}: DrawerProps) {
  const [snapPoint, setSnapPoint] =
    React.useState<DrawerPrimitive.Root.SnapPoint | null>(MEDIUM_DETENT);

  const expand = resizable ? () => setSnapPoint(LARGE_DETENT) : null;
  const contextValue = { modal, expand, showSwipeHandle, swipeDirection };

  const snapProps: Partial<DrawerPrimitive.Root.Props> = resizable
    ? {
        snapPoints: [MEDIUM_DETENT, LARGE_DETENT],
        snapPoint,
        onSnapPointChange: setSnapPoint,
      }
    : {};

  return (
    // oxlint-disable-next-line react-doctor/context-provider-value-from-unmemoized-local-literal -- The consuming web build runs React Compiler over this source and memoizes the context fields.
    <DrawerContext.Provider value={contextValue}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        modal={modal}
        swipeDirection={swipeDirection}
        onOpenChangeComplete={(open) => {
          // The next opening starts at the medium detent again.
          if (!open) setSnapPoint(MEDIUM_DETENT);
          onOpenChangeComplete?.(open);
        }}
        {...snapProps}
        {...props}
      />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/50 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute",
        className,
      )}
      {...props}
    />
  );
}

function DrawerSwipeHandle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      className={cn(
        "bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[swipe-direction=down]/drawer-popup:block",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ref,
  ...props
}: DrawerPrimitive.Popup.Props) {
  const { modal, expand, showSwipeHandle, swipeDirection } = useDrawer();
  const animatedHeightRef = useAnimatedHeight(ref);

  const swipeAxis =
    swipeDirection === "down" || swipeDirection === "up" ? "y" : "x";

  return (
    <DrawerPortal>
      {modal === true ? <DrawerOverlay /> : null}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        data-modal={modal}
        className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
      >
        <DrawerPrimitive.Popup
          ref={animatedHeightRef}
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          className={cn(
            "group/drawer-popup bg-background pointer-events-auto fixed z-50 flex h-auto flex-col outline-none transition-[transform,opacity] duration-300 data-swiping:duration-0",
            "transform-[translate3d(var(--drawer-swipe-movement-x,0px),calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)),0)] data-starting-style:transform-(--closed-transform) data-ending-style:transform-(--closed-transform)",
            "data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:mb-24 data-[swipe-direction=up]:max-h-[80vh] data-[swipe-direction=up]:rounded-b-lg data-[swipe-direction=up]:border-b data-[swipe-direction=up]:[--closed-transform:translate3d(0,-100%,0)]",
            "data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:mt-24 data-[swipe-direction=down]:max-h-[80vh] data-[swipe-direction=down]:rounded-t-lg data-[swipe-direction=down]:border-t data-[swipe-direction=down]:[--closed-transform:translate3d(0,100%,0)]",
            "data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:w-3/4 data-[swipe-direction=right]:border-l data-[swipe-direction=right]:sm:max-w-sm data-[swipe-direction=right]:[--closed-transform:translate3d(100%,0,0)]",
            "data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:w-3/4 data-[swipe-direction=left]:border-r data-[swipe-direction=left]:sm:max-w-sm data-[swipe-direction=left]:[--closed-transform:translate3d(-100%,0,0)]",
            className,
          )}
          {...props}
        >
          {showSwipeHandle ? <DrawerSwipeHandle /> : null}
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            onFocus={(event) => {
              // Keyboard focus only: the focus a tap leaves when it opens
              // the drawer must not skip the medium detent.
              if (event.target.matches(":focus-visible")) expand?.();
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[swipe-axis=y]/drawer-popup:text-center md:gap-1.5 md:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
};
