import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  APP_ENVIRONMENT,
  BUILD_TIMESTAMP,
  COMMIT_SHA,
  GAME_CLIENT_PACKAGE_VERSION,
} from "@/config/app";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const buildTimestampFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export const InformationSettingsTab = () => {
  const { t } = useTranslation();
  const notAvailable = t("settings.information.notAvailable");

  const metadataRows: {
    label: string;
    value: string;
    /** Raw value offered to the clipboard; undefined hides the copy action. */
    copyValue?: string;
  }[] = [
    {
      label: t("settings.information.versionLabel"),
      value: GAME_CLIENT_PACKAGE_VERSION || notAvailable,
      copyValue: GAME_CLIENT_PACKAGE_VERSION || undefined,
    },
    {
      label: t("settings.information.commitShaLabel"),
      value: COMMIT_SHA || notAvailable,
      copyValue: COMMIT_SHA || undefined,
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

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("settings.information.copied"));
    } catch {
      toast.error(t("settings.information.copyFailed"));
    }
  };

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="build-information"
        title={t("settings.information.buildDetailsTitle")}
      >
        {metadataRows.map(({ copyValue, ...row }) => (
          <SettingsRow
            key={row.label}
            label={row.label}
            controlClassName="ll:gap-1"
          >
            <span className="ll:block ll:max-w-64 ll:select-text ll:break-all ll:text-right ll:font-mono ll:text-[11px] ll:text-gray-200">
              {row.value}
            </span>
            {copyValue ? (
              <SettingsIconButton
                label={t("settings.information.copy", { label: row.label })}
                onClick={() => {
                  void copyToClipboard(copyValue);
                }}
              >
                <Copy aria-hidden />
              </SettingsIconButton>
            ) : null}
          </SettingsRow>
        ))}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
