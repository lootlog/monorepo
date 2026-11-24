import { BandSection } from "@/components/common/band-section";
import { DetailField } from "@/components/common/detail-field";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

const badgeSkeleton = (
  <Skeleton render={<span />} className="block h-5.5 w-24 rounded-full" />
);

const DISCORD_PERMISSIONS = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "AttachFiles",
  "ReadMessageHistory",
];

const valueSkeleton = <SkeletonLine className="h-3.5 w-40" />;

export const InfoSettingsSkeletonSections = () => {
  const { t } = useTranslation();

  return (
    <>
      <BandSection
        id="guild-info-sync-skeleton"
        title={t("settings.guildInfo.syncStatus")}
        trailing=<Skeleton className="h-8 w-37.5 rounded-lg" />
      >
        <dl className="divide-y divide-border/60">
          <DetailField label={t("settings.guildInfo.fields.status")}>
            {badgeSkeleton}
          </DetailField>
          <DetailField label={t("settings.guildInfo.fields.channels")}>
            {valueSkeleton}
          </DetailField>
          <DetailField label={t("settings.guildInfo.fields.permissions")}>
            {badgeSkeleton}
          </DetailField>
        </dl>
      </BandSection>
      <BandSection
        id="guild-info-permissions-skeleton"
        title={t("settings.guildInfo.permissionSection.title")}
        description={t("settings.guildInfo.permissionSection.description")}
      >
        <div className="flex flex-wrap gap-2">
          {DISCORD_PERMISSIONS.map((permission) => (
            <Skeleton
              key={permission}
              className="inline-flex h-5.5 items-center rounded-full border border-transparent px-2.5 text-xs font-semibold"
            >
              <span className="invisible">
                {t(`settings.guildInfo.discordPermissions.${permission}`)}
              </span>
            </Skeleton>
          ))}
        </div>
        <span className="text-sm">
          <SkeletonLine className="h-3.5 w-96 max-w-full" />
          <span className="sm:hidden">
            <SkeletonLine className="h-3.5 w-40" />
          </span>
        </span>
      </BandSection>
      <BandSection
        id="guild-info-activity-skeleton"
        title={t("settings.guildInfo.activity.title")}
      >
        <dl className="divide-y divide-border/60">
          <DetailField label={t("settings.guildInfo.fields.lastAttempt")}>
            {valueSkeleton}
          </DetailField>
          <DetailField label={t("settings.guildInfo.fields.lastSuccess")}>
            {valueSkeleton}
          </DetailField>
          <DetailField label={t("settings.guildInfo.fields.lastError")}>
            {valueSkeleton}
          </DetailField>
        </dl>
      </BandSection>
    </>
  );
};
