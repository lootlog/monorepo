import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";

export const GeneralSettingsTab: FC = () => {
  const { allowWorldSelection, toggleAllowWorldSelection } = useSettingsStore();

  return (
    <SettingsTabLayout
      title="Ustawienia ogólne"
      description="Skonfiguruj ogólne ustawienia dotyczące działania dodatku w grze."
    >
      <SettingsSection title="Zachowanie dodatku">
        <SettingsControlRow
          label="Pozwalaj na wybór świata"
          description="Nie działa na zgrupowanych timerach."
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={toggleAllowWorldSelection}
            id="allow-world-selection"
          />
        </SettingsControlRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
