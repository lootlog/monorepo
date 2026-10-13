import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Eye, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const GeneralSettingsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 pb-3">
      <SectionCard>
        <SectionCardHeader
          title={t("settings.general.vanityUrl.title")}
          description={t("settings.general.vanityUrl.description")}
          icon={Link2}
        />
        <SectionCardContent className="grid gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-full max-w-xs rounded-xl" />
          <div className="text-sm">
            <SkeletonLine className="h-3 w-56 max-w-full" />
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader
          title={t("settings.general.statsCard.title")}
          description={t("settings.general.statsCard.description")}
          icon={Eye}
          actions=<Skeleton className="h-[1.15rem] w-8 rounded-full" />
        />
        <SectionCardContent className="space-y-3">
          <div className="text-xs">
            <SkeletonLine className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="aspect-[1200/630] w-full max-w-xl" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
            <SkeletonLine className="h-3 w-48" />
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
