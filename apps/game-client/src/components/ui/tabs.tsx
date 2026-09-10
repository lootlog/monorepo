import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: BaseTabs.Root.Props) {
  return (
    <BaseTabs.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "ll:group/tabs ll:flex ll:gap-2 ll:data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "ll:group/tabs-list ll:inline-flex ll:w-fit ll:items-center ll:justify-center ll:rounded-lg ll:p-[3px] ll:text-muted-foreground ll:group-data-horizontal/tabs:h-8 ll:group-data-vertical/tabs:h-fit ll:group-data-vertical/tabs:flex-col ll:data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "ll:bg-muted",
        line: "ll:gap-1 ll:bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: BaseTabs.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: BaseTabs.Tab.Props) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "ll:relative ll:inline-flex ll:h-[calc(100%-1px)] ll:flex-1 ll:items-center ll:justify-center ll:gap-1.5 ll:rounded-md ll:border ll:border-transparent ll:px-1.5 ll:py-0.5 ll:text-sm ll:font-medium ll:whitespace-nowrap ll:text-foreground/60 ll:transition-all ll:group-data-vertical/tabs:w-full ll:group-data-vertical/tabs:justify-start ll:hover:text-foreground ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50 ll:focus-visible:outline-1 ll:focus-visible:outline-ring ll:disabled:pointer-events-none ll:disabled:opacity-50 ll:has-data-[icon=inline-end]:pr-1 ll:has-data-[icon=inline-start]:pl-1 ll:aria-disabled:pointer-events-none ll:aria-disabled:opacity-50 ll:dark:text-muted-foreground ll:dark:hover:text-foreground ll:group-data-[variant=default]/tabs-list:data-active:shadow-sm ll:group-data-[variant=line]/tabs-list:data-active:shadow-none ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0 ll:[&_svg:not([class*=size-])]:size-4 ll-custom-cursor-pointer",
        "ll:group-data-[variant=line]/tabs-list:bg-transparent ll:group-data-[variant=line]/tabs-list:data-active:bg-transparent ll:dark:group-data-[variant=line]/tabs-list:data-active:border-transparent ll:dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "ll:data-active:bg-background ll:data-active:text-foreground ll:dark:data-active:border-input ll:dark:data-active:bg-input/30 ll:dark:data-active:text-foreground",
        "ll:after:absolute ll:after:bg-foreground ll:after:opacity-0 ll:after:transition-opacity ll:group-data-horizontal/tabs:after:inset-x-0 ll:group-data-horizontal/tabs:after:bottom-[-5px] ll:group-data-horizontal/tabs:after:h-0.5 ll:group-data-vertical/tabs:after:inset-y-0 ll:group-data-vertical/tabs:after:-right-1 ll:group-data-vertical/tabs:after:w-0.5 ll:group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: BaseTabs.Panel.Props) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      className={cn("ll:flex-1 ll:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
