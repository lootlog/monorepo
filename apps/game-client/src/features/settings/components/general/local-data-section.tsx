import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { clearLootlogLocalData } from "@/lib/local-data";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

/**
 * Two-step destructive action: the first click arms it, the second clears
 * every local Lootlog store and reloads so nothing writes stale state back.
 */
export const LocalDataSection: FC = () => {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);

  return (
    <SettingsSection title={t("settings.general.localDataTitle")}>
      <SettingsRow
        controlId="clear-local-data"
        label={t("settings.general.clearLocalDataLabel")}
        description={t("settings.general.clearLocalDataDescription")}
        control="wide"
        controlClassName="ll:justify-end ll:gap-2"
      >
        {armed ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setArmed(false);
              }}
            >
              {t("settings.general.clearLocalDataCancel")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              autoFocus
              onClick={() => {
                clearLootlogLocalData();
                window.location.reload();
              }}
            >
              {t("settings.general.clearLocalDataConfirm")}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setArmed(true);
            }}
          >
            {t("settings.general.clearLocalDataAction")}
          </Button>
        )}
      </SettingsRow>
    </SettingsSection>
  );
};
