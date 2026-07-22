import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: BaseTabs.Root.Props) {
  return (
    <BaseTabs.Root
      data-slot="tabs"
      className={cn("ll:flex ll:flex-col ll:gap-2", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: BaseTabs.List.Props) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        "ll:inline-flex ll:w-fit ll:items-center ll:justify-center ll:rounded-lg ll:gap-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: BaseTabs.Tab.Props) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "ll:data-[active]:bg-purple-500/40 ll:data-[active]:border-purple-400 ll:text-[12px] ll:text-white ll-custom-cursor-pointer ll:border-solid ll:border-gray-400 ll:box-border ll:border ll:rounded-sm ll:py-1 ll:px-2 ll:bg-transparent ll:hover:bg-gray-400/30 ll:transition-all ll:mt-1",
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
      className={cn("flex-1 outline-none ll:text-[12px]", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
