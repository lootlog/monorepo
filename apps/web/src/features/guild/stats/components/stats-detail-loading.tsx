import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { Skeleton } from "@lootlog/ui/components/skeleton";
export function StatsDetailLoading({ entity }: { entity: "npc" | "member" }) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="px-3 py-3 flex flex-col gap-4">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton
                className={
                  entity === "member"
                    ? "h-12 w-12 rounded-full"
                    : "h-10 w-10 rounded"
                }
              />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton
                  className={entity === "member" ? "h-4 w-32" : "h-4 w-40"}
                />
                <Skeleton
                  className={entity === "member" ? "h-3 w-48" : "h-3 w-24"}
                />
              </div>
            </div>
          </SectionCardContent>
        </SectionCard>
        <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex h-14 items-center gap-4 border-b border-border px-4"
              >
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
