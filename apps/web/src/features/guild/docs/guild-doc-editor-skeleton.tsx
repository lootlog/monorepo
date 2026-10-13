import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

export const GuildDocEditorSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 px-3 py-3">
          <PageHeader
            icon={FileText}
            title=<SkeletonLine className="h-5 w-40" />
            description=<SkeletonLine className="h-3 w-56 max-w-full" />
            status=<Skeleton className="h-[22px] w-24 rounded-full" />
            actions={
              <>
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="size-9 rounded-lg" />
              </>
            }
          />
          <SectionCard className="flex min-h-0 flex-1 flex-col">
            <SectionCardHeader title={t("docs.list.title")} />
            <SectionCardContent className="flex min-h-0 flex-col gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <div className="flex min-h-[420px] flex-col overflow-hidden rounded-md border border-border bg-background">
                <div className="shrink-0 border-b border-border bg-muted/30 p-2">
                  <Skeleton className="h-8 w-full max-w-md" />
                </div>
                <div className="min-h-[420px] flex-1" />
              </div>
            </SectionCardContent>
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
