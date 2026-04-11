import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GuildSidebarNavPlaceholder = () => {
  return (
    <div className="flex h-full w-full flex-1 flex-col gap-2 overflow-hidden bg-sidebar">
      <div className="mb-2 flex h-14 min-h-14 items-center border-b px-2">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-2 px-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="px-2 pt-3">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2 px-2 pb-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
};
