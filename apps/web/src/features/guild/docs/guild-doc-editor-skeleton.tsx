import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GuildDocEditorSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </Card>
          <Card className="gap-3 border-border bg-card p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[460px] w-full" />
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
