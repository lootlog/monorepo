import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronRightIcon,
  DotFilledIcon,
} from "@radix-ui/react-icons";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "ll-flex ll-cursor-default ll-select-none ll-items-center ll-rounded-sm ll-px-2 ll-py-1.5 ll-text-sm ll-outline-none",
      inset && "ll-pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="ll-ml-auto ll-h-4 ll-w-4" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "ll-z-50 ll-min-w-[8rem] ll-overflow-hidden ll-rounded-md ll-border ll-border-gray-400 ll-p-1 ll-text-popover-foreground ll-shadow-lg data-[state=open]:ll-animate-in data-[state=closed]:ll-animate-out data-[state=closed]:ll-fade-out-0 data-[state=open]:ll-fade-in-0 data-[state=closed]:ll-zoom-out-95 data-[state=open]:ll-zoom-in-95 data-[side=bottom]:ll-slide-in-from-top-2 data-[side=left]:ll-slide-in-from-right-2 data-[side=right]:ll-slide-in-from-left-2 data-[side=top]:ll-slide-in-from-bottom-2 ll-origin-[--radix-context-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "ll-z-[500] ll-max-h-[--radix-context-menu-content-available-height] ll-min-w-[8rem] ll-overflow-y-auto ll-overflow-x-hidden ll-rounded-md ll-border ll-p-1 ll-text-popover-foreground ll-shadow-md data-[state=open]:ll-animate-in data-[state=closed]:ll-animate-out data-[state=closed]:ll-fade-out-0 data-[state=open]:ll-fade-in-0 data-[state=closed]:ll-zoom-out-95 data-[state=open]:ll-zoom-in-95 data-[side=bottom]:ll-slide-in-from-top-2 data-[side=left]:ll-slide-in-from-right-2 data-[side=right]:ll-slide-in-from-left-2 data-[side=top]:ll-slide-in-from-bottom-2 ll-origin-[--radix-context-menu-content-transform-origin] ll-bg-black/80 ll-flex ll-flex-col ll-gap-0.5 ll-border-solid ll-border-gray-400 ll-text-xs",
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "ll-relative ll-flex ll-cursor-default ll-select-none ll-items-center ll-rounded-sm ll-py-1.5 ll-outline-none data-[disabled]:ll-pointer-events-none data-[disabled]:ll-opacity-50 ll-text-white hover:ll-bg-gray-400/30 ll-text-xs ll-border-solid ll-border-gray-400 ll-border ll-h-2 ll-px-1",
      inset && "ll-pl-8",
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "ll-relative ll-flex ll-cursor-default ll-select-none ll-items-center ll-rounded-sm ll-py-1.5 ll-pl-8 ll-pr-2 ll-text-sm ll-outline-none data-[disabled]:ll-pointer-events-none data-[disabled]:ll-opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="ll-absolute ll-left-2 ll-flex ll-h-3.5 ll-w-3.5 ll-items-center ll-justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <CheckIcon className="ll-h-4 ll-w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "ll-relative ll-flex ll-cursor-default ll-select-none ll-items-center ll-rounded-sm ll-py-1.5 ll-pl-8 ll-pr-2 ll-text-sm ll-outline-none data-[disabled]:ll-pointer-events-none data-[disabled]:ll-opacity-50 ll-h-4",
      className
    )}
    {...props}
  >
    <span className="ll-absolute ll-left-2 ll-flex ll-h-4 ll-w-3.5 ll-items-center ll-justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <DotFilledIcon className="ll-h-4 ll-w-4 ll-fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "ll-px-2 ll-py-1.5 ll-text-sm ll-font-semibold",
      inset && "ll-pl-8",
      className
    )}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("ll--mx-1 ll-my-1 ll-h-px ll-bg-border", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ll-ml-auto ll-text-xs ll-tracking-widest", className)}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
