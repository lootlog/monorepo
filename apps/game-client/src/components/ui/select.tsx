import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@lootlog/ui/lib/utils";
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
      "ll:flex ll:h-6ll:w-full ll:items-center ll:justify-between ll:whitespace-nowrap ll:rounded! ll:box-border ll:border ll:border-solid ll:bg-transparent ll:px-1.5 ll:py-2.5! ll:text-sm ll:placeholder:text-muted-foreground ll:disabled:cursor-not-allowed ll:disabled:opacity-50 ll:[&>span]:line-clamp-1 ll:border-gray-400 ll:outline-none",
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
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "ll:border-solid ll:border-gray-400 ll:bg-black/90 ll:rounded ll:border ll:box-border ll:shadow-md ll:data-[state=open]:animate-in ll:data-[state=closed]:animate-out ll:data-[state=closed]:fade-out-0 ll:data-[state=open]:fade-in-0 ll:data-[state=closed]:zoom-out-95 ll:data-[state=open]:zoom-in-95 ll:data-[side=bottom]:slide-in-from-top-2 ll:data-[side=left]:slide-in-from-right-2 ll:data-[side=right]:slide-in-from-left-2 ll:data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "ll:data-[side=bottom]:translate-y-1 ll:data-[side=left]:-translate-x-1 ll:data-[side=right]:translate-x-1 ll:data-[side=top]:-translate-y-1 ll:min-w-(--radix-select-trigger-width)",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "ll:box-border ll:w-full ll:flex ll:flex-col ll:shadow-lg ll:items-center ll:justify-center ll:px-1 ll:gap-1",
          position === "popper" &&
            "ll:h-(--radix-select-trigger-height) ll:min-w-(--radix-select-trigger-width)",
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
    className={cn(
      "ll:px-2 ll:text-sm ll:font-semibold ll:text-[11px]",
      className,
    )}
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
      "ll:relative ll:data-[state=checked]:bg-gray-400/30 ll:h-6 ll:transition-all hover:bg-gray-400/30 ll:flex ll:cursor-default ll:select-none ll:box-border ll:border-gray-400 ll:border-solid ll:border ll:items-center ll:text-white ll:text-[11px] ll:bg-transparent ll:rounded-sm ll:py-1.5 ll:pl-2 ll:text-sm ll:outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("ll:-mx-1 ll:my-1 ll:h-px ll:bg-muted", className)}
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
