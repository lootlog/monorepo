"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "cn";
import { FilterBarContext } from "@lootlog/ui/components/filter-bar-context";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  collisionPadding,
  container,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
  > & {
    container?: HTMLElement | null;
  }) {
  return (
    // A popup is never part of the filter bar its trigger sits in: context
    // passes through the portal, so filters inside keep their full fields.
    <FilterBarContext value={false}>
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Positioner
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className="isolate z-[100]"
        >
          <PopoverPrimitive.Popup
            data-slot="popover-content"
            className={cn(
              "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[100] w-72 origin-(--transform-origin) rounded-xl border p-4 shadow-md outline-hidden",
              className,
            )}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </FilterBarContext>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
