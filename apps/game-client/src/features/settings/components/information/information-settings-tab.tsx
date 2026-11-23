import { CopyDiagnosticsButton } from "@/components/copy-diagnostics-button";
import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import {
  APP_ENVIRONMENT,
  BUILD_TIMESTAMP,
  COMMIT_SHA,
  GAME_CLIENT_PACKAGE_VERSION,
} from "@/config/app";
import { createDiagnosticsReport } from "@/lib/diagnostics-report";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { once } from "es-toolkit";
import { useTranslation } from "react-i18next";
import { CopyBuildValueButton } from "@/features/settings/components/information/copy-build-value-button";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const getBuildTimestampFormatter = once(
  () =>
    new Intl.DateTimeFormat(PRODUCT_LOCALE, {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }),
);

export const InformationSettingsTab = () => {
  const { t } = useTranslation();
  const notAvailable = t("settings.information.notAvailable");

  const metadataRows: {
    label: string;
    value: string;
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
        ? getBuildTimestampFormatter().format(new Date(BUILD_TIMESTAMP))
        : notAvailable,
    },
  ];

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
            control="wide"
            controlClassName="ll:gap-1"
          >
            <span
              className="ll:min-w-0 ll:flex-1 ll:select-text ll:truncate ll:text-right ll:font-mono ll:text-xs ll:tabular-nums ll:text-muted-foreground"
              title={row.value}
            >
              {row.value}
            </span>
            {copyValue ? (
              <CopyBuildValueButton label={row.label} value={copyValue} />
            ) : null}
          </SettingsRow>
        ))}
      </SettingsSection>
      <SettingsSection
        controlId="diagnostics-report"
        title={t("settings.information.diagnosticsTitle")}
        description={t("settings.information.diagnosticsDescription")}
      >
        <div>
          <CopyDiagnosticsButton
            getReport={() =>
              createDiagnosticsReport({
                bridgeHealth: margonemRuntimeBridge.getHealth(),
              })
            }
          />
        </div>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
