import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "ll-flex ll-h-6 ll-w-full ll-items-center ll-justify-between ll-whitespace-nowrap ll-rounded-md ll-border ll-border-input ll-bg-transparent ll-px-3 ll-py-2 ll-text-sm ll-shadow-sm ll-ring-offset-background placeholder:ll-text-muted-foreground focus:ll-outline-none focus:ll-ring-1 focus:ll-ring-ring disabled:ll-cursor-not-allowed disabled:ll-opacity-50 [&>span]:ll-line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDownIcon className="ll-h-4 ll-w-4 ll-opacity-50" />
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
      "ll-flex ll-cursor-default ll-items-center ll-justify-center ll-py-1",
      className
    )}
    {...props}
  >
    <ChevronUpIcon className="ll-h-4 ll-w-4" />
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
      "ll-flex ll-cursor-default ll-items-center ll-justify-center ll-py-1",
      className
    )}
    {...props}
  >
    <ChevronDownIcon className="ll-h-4 ll-w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "ll-relative ll-z-50 ll-max-h-96 ll-min-w-[8rem] ll-overflow-hidden ll-rounded-md ll-border ll-bg-popover ll-text-popover-foreground ll-shadow-md data-[state=open]:ll-animate-in data-[state=closed]:ll-animate-out data-[state=closed]:ll-fade-out-0 data-[state=open]:ll-fade-in-0 data-[state=closed]:ll-zoom-out-95 data-[state=open]:ll-zoom-in-95 data-[side=bottom]:ll-slide-in-from-top-2 data-[side=left]:ll-slide-in-from-right-2 data-[side=right]:ll-slide-in-from-left-2 data-[side=top]:ll-slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:ll-translate-y-1 data-[side=left]:ll--translate-x-1 data-[side=right]:ll-translate-x-1 data-[side=top]:ll--translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "ll-p-1",
          position === "popper" &&
            "ll-h-[var(--radix-select-trigger-height)] ll-w-full ll-min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("ll-px-2 ll-py-1.5 ll-text-sm ll-font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "ll-relative ll-flex ll-w-full ll-cursor-default ll-select-none ll-items-center ll-rounded-sm ll-py-1.5 ll-pl-2 ll-pr-8 ll-text-sm ll-outline-none focus:ll-bg-accent focus:ll-text-accent-foreground data-[disabled]:ll-pointer-events-none data-[disabled]:ll-opacity-50",
      className
    )}
    {...props}
  >
    <span className="ll-absolute ll-right-2 ll-flex ll-h-3.5 ll-w-3.5 ll-items-center ll-justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="ll-h-4 ll-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("ll--mx-1 ll-my-1 ll-h-px ll-bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
