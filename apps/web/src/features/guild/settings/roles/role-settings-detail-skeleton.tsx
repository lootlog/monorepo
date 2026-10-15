import { BandSection } from "@/components/common/band-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { DetailSkeleton } from "@/components/common/detail-skeleton";

const metaSkeleton = (
  <span className="text-xs leading-tight">
    <SkeletonLine className="h-3 w-24" />
  </span>
);

export const RoleSettingsDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <DetailSkeleton
      meta={
        <>
          {metaSkeleton}
          {metaSkeleton}
        </>
      }
    >
      <div className="pb-24">
        <BandSection
          id="role-level-range-skeleton"
          title={t("settings.roles.levelRangeTitle")}
          description={t("settings.roles.levelRangeDescription")}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-25 rounded-lg" />
            <span className="flex h-9 items-center text-muted-foreground">
              -
            </span>
            <Skeleton className="h-9 w-25 rounded-lg" />
          </div>
        </BandSection>
        {PERMISSION_CATEGORIES.map((group) => (
          <BandSection
            key={group.groupKey}
            id={`role-permissions-${group.groupKey}-skeleton`}
            title={t(`permissions.groups.${group.groupKey}.name`)}
            description={t(`permissions.groups.${group.groupKey}.description`)}
            tiled
          >
            {group.permissions.map((permission) => (
              <div
                key={permission}
                data-list-tile
                className={cn(
                  "flex items-center gap-3 py-3",
                  LIST_TILE_RULE_CLASS,
                  LIST_TILE_INSET_CLASS,
                )}
              >
                <Skeleton className="size-4 shrink-0 rounded-[4px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium">
                    {t(`permissions.${permission}`)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(`permissions.descriptions.${permission}`)}
                  </span>
                </div>
              </div>
            ))}
          </BandSection>
        ))}
      </div>
    </DetailSkeleton>
  );
};
