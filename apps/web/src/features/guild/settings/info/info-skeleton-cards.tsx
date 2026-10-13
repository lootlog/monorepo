import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import { History, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InfoField } from "./info-field";

// Sits on the text baseline like the loaded outline badge, so the field keeps
// its loaded height.
const badgeSkeleton = (
  <Skeleton
    render={<span />}
    className="inline-block h-[22px] w-20 rounded-full align-middle"
  />
);

const valueSkeleton = <SkeletonLine className="h-4 w-28" />;

export const InfoSettingsSkeletonCards = () => {
  const { t } = useTranslation();

  return (
    <>
      <SectionCard>
        <SectionCardHeader
          // The icon depends on the loaded permission status.
          title={
            <span className="flex items-center gap-2">
              <Skeleton className="size-5 shrink-0 rounded-md" />
              {t("settings.guildInfo.syncStatus")}
            </span>
          }
          description={
            <span className="block pl-7">
              {t("settings.guildInfo.syncStatusDescription")}
            </span>
          }
          actions=<Skeleton className="h-8 w-28 rounded-xl" />
        />
        <SectionCardContent>
          <dl className="grid gap-3 lg:grid-cols-3">
            <InfoField label={t("settings.guildInfo.fields.status")}>
              {badgeSkeleton}
            </InfoField>
            <InfoField label={t("settings.guildInfo.fields.channels")}>
              {valueSkeleton}
            </InfoField>
            <InfoField label={t("settings.guildInfo.fields.permissions")}>
              {badgeSkeleton}
            </InfoField>
          </dl>
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader
          title={t("settings.guildInfo.permissionSection.title")}
          icon={KeyRound}
          description={t("settings.guildInfo.permissionSection.description")}
        />
        <SectionCardContent className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[22px] w-28 rounded-full" />
          ))}
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader
          title={t("settings.guildInfo.activity.title")}
          icon={History}
        />
        <SectionCardContent>
          <dl className="grid gap-3 lg:grid-cols-3">
            <InfoField label={t("settings.guildInfo.fields.lastAttempt")}>
              {valueSkeleton}
            </InfoField>
            <InfoField label={t("settings.guildInfo.fields.lastSuccess")}>
              {valueSkeleton}
            </InfoField>
            <InfoField label={t("settings.guildInfo.fields.lastError")}>
              {valueSkeleton}
            </InfoField>
          </dl>
        </SectionCardContent>
      </SectionCard>
    </>
  );
};
