import { BandSection } from "@/components/common/band-section";
import { DetailField } from "@/components/common/detail-field";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { DetailSkeleton } from "@/components/common/detail-skeleton";

/** Each section's always-present fields, as `MemberData` labels them. */
const SECTIONS = [
  {
    id: "member-access-skeleton",
    titleKey: "settings.members.access.title",
    hasDescription: true,
    fieldKeys: [
      "settings.members.access.status",
      "settings.members.access.discord",
      "settings.members.access.lastActivity",
    ],
  },
  {
    id: "member-discord-sync-skeleton",
    titleKey: "settings.members.discordSync.title",
    hasDescription: false,
    fieldKeys: [
      "settings.members.discordSync.fields.technicalStatus",
      "settings.members.discordSync.fields.lastAttemptAt",
      "settings.members.discordSync.fields.lastConfirmedAt",
    ],
  },
  {
    id: "member-activity-skeleton",
    titleKey: "settings.members.webActivity.title",
    hasDescription: false,
    fieldKeys: [
      "settings.members.webActivity.fields.lastSeenAt",
      "settings.members.webActivity.fields.lastSeenInGameAt",
      "settings.members.webActivity.fields.webVisitCount",
      "settings.members.webActivity.fields.gameVisitCount",
      "settings.members.webActivity.fields.webStatus",
      "settings.members.webActivity.fields.gameStatus",
    ],
  },
];

export const MemberSettingsDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <DetailSkeleton
      meta={
        <>
          <span className="flex items-center gap-2">
            <Skeleton className="h-5.5 w-27 rounded-full" />
            <Skeleton className="h-5.5 w-30 rounded-full" />
          </span>
          <span className="text-xs leading-tight">
            <SkeletonLine className="h-3 w-20" />
          </span>
        </>
      }
      actions={
        <>
          <Skeleton className="h-8 w-47 rounded-lg" />
          <Skeleton className="h-8 w-30 rounded-lg" />
        </>
      }
    >
      <div className="pb-6">
        {SECTIONS.map((section) => (
          <BandSection
            key={section.id}
            id={section.id}
            title={t(section.titleKey)}
          >
            {section.hasDescription && (
              <span className="text-sm">
                <SkeletonLine className="h-3 w-80 max-w-full" />
                {/* Phones wrap the sentence onto a second line. */}
                <span className="sm:hidden">
                  <SkeletonLine className="h-3 w-40" />
                </span>
              </span>
            )}
            <dl className="divide-y divide-border/60">
              {section.fieldKeys.map((fieldKey) => (
                <DetailField key={fieldKey} label={t(fieldKey)}>
                  <SkeletonLine className="h-3 w-32" />
                </DetailField>
              ))}
            </dl>
          </BandSection>
        ))}
        <BandSection
          id="member-roles-skeleton"
          title={t("settings.members.rolesTitle")}
          tiled
        >
          <ListTileSkeleton />
          <ListTileSkeleton />
        </BandSection>
      </div>
    </DetailSkeleton>
  );
};
