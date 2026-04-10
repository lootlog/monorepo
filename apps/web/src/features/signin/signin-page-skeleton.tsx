import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const SigninPageSkeleton = () => {
  return (
    <div className="flex h-full items-center justify-center bg-background/50">
      <Card className="w-full max-w-sm border-border bg-card/60 p-6 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-10 w-10 rounded-xl" />
            <Skeleton className="mx-auto h-5 w-32" />
            <Skeleton className="mx-auto h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </Card>
    </div>
  );
};
