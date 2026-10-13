import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export const RoleSettingsDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar [scrollbar-gutter:stable]">
      <PageHeader
        media={<Skeleton className="size-9 shrink-0 rounded-lg" />}
        title=<SkeletonLine className="h-5 w-40" />
        description=<SkeletonLine className="h-3 w-56 max-w-full" />
        metadata={Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="size-7 rounded-md" />
        ))}
      />
      <div className="pb-24">
        <SectionCard>
          <SectionCardHeader
            title={t("settings.roles.levelRangeTitle")}
            description={t("settings.roles.levelRangeDescription")}
            icon={Settings}
          />
          <SectionCardContent>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-full max-w-[100px] rounded-xl" />
              <span className="text-muted-foreground">-</span>
              <Skeleton className="h-9 w-full max-w-[100px] rounded-xl" />
            </div>
          </SectionCardContent>
        </SectionCard>
        <div className="space-y-3 pt-3">
          {PERMISSION_CATEGORIES.map((group) => (
            <SectionCard key={group.groupKey} className="overflow-hidden">
              <SectionCardHeader
                icon={group.icon}
                // The loaded title is an accordion trigger with text-sm type.
                title={
                  <span className="block text-sm">
                    {t(`permissions.groups.${group.groupKey}.name`)}
                  </span>
                }
                description={t(
                  `permissions.groups.${group.groupKey}.description`,
                )}
                actions={
                  <span className="text-xs">
                    <SkeletonLine className="h-3 w-6" />
                  </span>
                }
              />
              <div className="divide-y divide-border/50 border-t border-border/50">
                {group.permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-3 px-4 py-3 pl-6"
                  >
                    <Skeleton className="size-4 shrink-0 rounded-sm" />
                    <div className="flex-1 space-y-0.5">
                      <Skeleton className="h-3.5 w-40 max-w-full" />
                      <div className="text-xs">
                        <SkeletonLine className="h-3 w-64 max-w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </div>
  );
};
