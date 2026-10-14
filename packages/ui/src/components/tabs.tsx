"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "cn";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

const tabsListSizes = {
  sm: "h-8",
  default: "h-9",
  lg: "h-10",
};

const tabsListVariants = {
  /** A bordered, rounded control that stands on its own. */
  pill: "rounded-lg border border-border",
  /** A square strip that fills a card row between its separators. */
  flush: "rounded-none",
};

/** Looks like the animated toggle group: a lime pill slides to the active tab. */
function TabsList({
  className,
  size = "default",
  variant = "pill",
  children,
  ...props
}: TabsPrimitive.List.Props & {
  size?: keyof typeof tabsListSizes;
  variant?: keyof typeof tabsListVariants;
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-size={size}
      data-variant={variant}
      className={cn(
        tabsListSizes[size],
        tabsListVariants[variant],
        "relative isolate inline-flex w-fit max-w-full items-stretch overflow-x-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute top-0 left-(--active-tab-left) -z-10 h-full w-(--active-tab-width) rounded-[inherit] bg-primary transition-[left,width] duration-150 ease-emphasized motion-reduce:transition-none"
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[inherit] px-3 text-sm font-medium whitespace-nowrap text-foreground outline-none transition-[color,scale] duration-150 ease-emphasized focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 data-active:text-primary-foreground motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
