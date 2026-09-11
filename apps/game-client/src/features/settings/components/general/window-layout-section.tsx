import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const WindowLayoutSection: FC = () => {
  const { t } = useTranslation();
  const resetWindowLayout = useWindowsStore((state) => state.resetWindowLayout);

  return (
    <SettingsSection title={t("settings.general.windowsTitle")}>
      <SettingsRow
        controlId="reset-window-layout"
        label={t("settings.general.resetWindowLayoutLabel")}
        description={t("settings.general.resetWindowLayoutDescription")}
        control="wide"
        controlClassName="ll:justify-end"
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            resetWindowLayout();
            toast.success(t("settings.general.resetWindowLayoutDone"));
          }}
        >
          {t("settings.general.resetWindowLayoutAction")}
        </Button>
      </SettingsRow>
    </SettingsSection>
  );
};
