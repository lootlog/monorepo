import { BandSection } from "@/components/common/band-section";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

// Mirrors `ThemeCard`: preview image, three color swatches, title and description.
export const AppearanceSettingsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <SettingsTabSkeleton>
      <BandSection
        id="appearance-theme-skeleton"
        title={t("settings.appearance.themeSection.title")}
        description={t("settings.appearance.themeSection.description")}
        wide
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4"
            >
              <Skeleton className="mb-1 h-32 w-full rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="size-10 rounded-md" />
              </div>
              <div>
                <div className="text-sm">
                  <SkeletonLine className="h-3.5 w-24" />
                </div>
                <div className="text-xs">
                  <SkeletonLine className="h-3 w-40 max-w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </BandSection>
    </SettingsTabSkeleton>
  );
};
