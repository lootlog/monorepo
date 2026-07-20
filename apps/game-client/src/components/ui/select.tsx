import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { getLootlogPortalContainer } from "./theme-boundary";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";

const Select = SelectPrimitive.Root;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "ll:flex ll:h-6 ll:w-full ll:min-w-0 ll:items-center ll:justify-between ll:gap-1 ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-transparent ll:px-1.5 ll:text-xs ll:text-white ll:box-border ll:outline-none ll:disabled:cursor-not-allowed ll:disabled:opacity-50 ll:focus-visible:border-ring ll:focus-visible:ring-ring/50 ll:focus-visible:ring-[3px] ll:[&>span]:min-w-0 ll:[&>span]:truncate ll:[&>span]:text-left ll:[&>span[data-placeholder]]:text-gray-400 ll-custom-cursor-pointer",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDownIcon className="ll:h-4 ll:w-4 ll:opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-white",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon className="ll:h-4 ll:w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-white",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon className="ll:h-4 ll:w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal container={getLootlogPortalContainer()}>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "ll:z-[500] ll:max-h-[--radix-select-content-available-height] ll:min-w-[8rem] ll:overflow-y-auto ll:overflow-x-hidden ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-black/90 ll:text-white ll:box-border ll:shadow-md ll:origin-[--radix-select-content-transform-origin] data-[state=open]:ll:animate-in data-[state=closed]:ll:animate-out data-[state=closed]:ll:fade-out-0 data-[state=open]:ll:fade-in-0 data-[state=closed]:ll:zoom-out-95 data-[state=open]:ll:zoom-in-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:ll:translate-y-1 data-[side=left]:ll:-translate-x-1 data-[side=right]:ll:translate-x-1 data-[side=top]:ll:-translate-y-1 ll:min-w-[var(--radix-select-trigger-width)]",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "ll:flex ll:w-full ll:flex-col ll:gap-1 ll:box-border ll:p-1",
          position === "popper" &&
            "ll:min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "ll:relative ll:flex ll:h-6 ll:w-full ll:select-none ll:items-center ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-transparent ll:py-1 ll:pl-2 ll:pr-7 ll:text-[11px] ll:text-white ll:box-border ll:outline-none ll:transition-colors ll:hover:bg-gray-400/30 ll:data-[state=checked]:bg-gray-400/30 ll-custom-cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="ll:absolute ll:right-2 ll:flex ll:h-3.5 ll:w-3.5 ll:items-center ll:justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="ll:h-4 ll:w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
