import { BandSection } from "@/components/common/band-section";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

export const AccountSettingsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <SettingsTabSkeleton>
      <BandSection
        id="account-session-skeleton"
        title={t("settings.account.session.title")}
        description={t("settings.account.session.description")}
      >
        <Skeleton className="h-9 w-32 rounded-lg" />
      </BandSection>
      <BandSection
        id="account-delete-skeleton"
        title={t("settings.account.dangerZone.title")}
        description={t("settings.account.dangerZone.description")}
      >
        <Skeleton className="h-9 w-32 rounded-lg" />
      </BandSection>
    </SettingsTabSkeleton>
  );
};
