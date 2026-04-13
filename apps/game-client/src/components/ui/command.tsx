import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "ll:bg-popover ll:text-popover-foreground ll:flex ll:h-full ll:w-full ll:flex-col ll:overflow-hidden ll:rounded-md",
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="ll:flex ll:h-6 ll:items-center ll:gap-1 ll:border-b ll:border-gray-400 ll:px-2"
    >
      <Search className="ll:size-3 ll:shrink-0 ll:opacity-50 ll:text-white" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "placeholder:ll:text-muted-foreground ll:flex ll:h-6 ll:w-full ll:bg-transparent ll:py-1 ll:text-xs ll:text-white ll:outline-none ll:border-none focus:ll:outline-none focus:ll:ring-0 focus-visible:ll:outline-none focus-visible:ll:ring-0 disabled:ll:cursor-not-allowed disabled:ll:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "ll:max-h-[300px] scroll:ll:py-1 ll:overflow-x-hidden ll:overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="ll:py-6 ll:text-center ll:text-sm"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "ll:text-foreground [&_[cmdk-group-heading]]:ll:text-muted-foreground ll:overflow-hidden ll:p-1 [&_[cmdk-group-heading]]:ll:px-1 [&_[cmdk-group-heading]]:ll:py-1.5 [&_[cmdk-group-heading]]:ll:text-xs [&_[cmdk-group-heading]]:ll:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("ll:bg-border ll:-mx-1 ll:h-px", className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:ll:bg-primary/50 data-[selected=true]:ll:text-accent-foreground [&_svg:not([class*='text-'])]:ll:text-muted-foreground ll:relative ll:flex ll:cursor-default ll:items-center ll:gap-2 ll:rounded-sm ll:px-1 ll:py-1.5 ll:text-sm ll:outline-hidden ll:select-none data-[disabled=true]:ll:pointer-events-none data-[disabled=true]:ll:opacity-50 [&_svg]:ll:pointer-events-none [&_svg]:ll:shrink-0 [&_svg:not([class*='size-'])]:ll:size-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
