import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GuildDocsListSkeleton = () => {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="gap-3 border-border bg-card p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
