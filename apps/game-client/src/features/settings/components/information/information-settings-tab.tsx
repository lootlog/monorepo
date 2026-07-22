import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  APP_ENVIRONMENT,
  BUILD_TIMESTAMP,
  COMMIT_SHA,
  GAME_CLIENT_PACKAGE_VERSION,
} from "@/config/app";
import { useTranslation } from "react-i18next";

const buildTimestampFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export const InformationSettingsTab = () => {
  const { t } = useTranslation();
  const notAvailable = t("settings.information.notAvailable");
  const metadataRows = [
    {
      label: t("settings.information.versionLabel"),
      value: GAME_CLIENT_PACKAGE_VERSION || notAvailable,
    },
    {
      label: t("settings.information.commitShaLabel"),
      value: COMMIT_SHA || notAvailable,
    },
    {
      label: t("settings.information.environmentLabel"),
      value: APP_ENVIRONMENT || notAvailable,
    },
    {
      label: t("settings.information.buildTimestampLabel"),
      value: BUILD_TIMESTAMP
        ? buildTimestampFormatter.format(new Date(BUILD_TIMESTAMP))
        : notAvailable,
    },
  ];

  return (
    <SettingsTabLayout
      title={t("settings.information.title")}
      description={t("settings.information.description")}
    >
      <SettingsSection title={t("settings.information.buildDetailsTitle")}>
        {metadataRows.map((row) => (
          <SettingsControlRow key={row.label} label={row.label}>
            <span className="ll:block ll:max-w-64 ll:select-text ll:break-all ll:text-right ll:font-mono ll:text-[11px] ll:text-gray-200">
              {row.value}
            </span>
          </SettingsControlRow>
        ))}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
