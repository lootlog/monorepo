import { BandSection } from "@/components/common/band-section";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";

export const GeneralSettingsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <SettingsTabSkeleton>
      <div className="pb-24">
        <BandSection
          id="settings-vanity-url-skeleton"
          title={t("settings.general.vanityUrl.title")}
          description={t("settings.general.vanityUrl.description")}
        >
          <div className="grid gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
            <span className="text-sm">
              <SkeletonLine className="h-3 w-56 max-w-full" />
            </span>
          </div>
        </BandSection>
        <BandSection
          id="settings-stats-card-skeleton"
          title={t("settings.general.statsCard.title")}
          description={t("settings.general.statsCard.description")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm leading-none font-medium">
                {t("settings.general.statsCard.toggleLabel")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("settings.general.statsCard.toggleDescription")}
              </span>
            </div>
            <Skeleton className="h-[1.15rem] w-8 shrink-0 rounded-full" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border">
              <Skeleton className="aspect-[1200/630] w-full rounded-none" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <span className="text-xs">
                <SkeletonLine className="h-3 w-56" />
              </span>
            </div>
          </div>
        </BandSection>
      </div>
    </SettingsTabSkeleton>
  );
};
