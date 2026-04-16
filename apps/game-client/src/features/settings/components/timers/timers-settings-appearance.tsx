import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import type { FC } from "react";

export const TimersSettingsAppearance: FC = () => {
  const { displayConfig, setDisplayConfig } = useTimersStore();

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <SettingsSection title="Widoczność">
        <SettingsControlRow label="Wyświetlaj poziom potwora">
          <Switch
            checked={displayConfig.showLevel}
            onCheckedChange={(checked) => {
              setDisplayConfig({ ...displayConfig, showLevel: checked });
            }}
            id="show-level"
          />
        </SettingsControlRow>
        <SettingsControlRow label="Wyświetlaj typ potwora">
          <Switch
            checked={displayConfig.showType}
            onCheckedChange={(checked) => {
              setDisplayConfig({ ...displayConfig, showType: checked });
            }}
            id="show-type"
          />
        </SettingsControlRow>
      </SettingsSection>
      <SettingsSection title="Układ">
        <SettingsControlRow
          label="Tryb wyświetlania pojedynczego timera"
          description="Kolumny wyświetlają czas pod nazwą timera. Wiersze wyświetlają czas obok nazwy timera."
          controlClassName="ll:w-40"
        >
          <ToggleGroup
            type="single"
            size="xs"
            onValueChange={(value: "column" | "row") => {
              if (value) {
                setDisplayConfig({
                  ...displayConfig,
                  singleTimerDisplayMode: value,
                });
              }
            }}
            value={displayConfig.singleTimerDisplayMode}
          >
            <ToggleGroupItem value="column">Kolumny</ToggleGroupItem>
            <ToggleGroupItem value="row">Wiersze</ToggleGroupItem>
          </ToggleGroup>
        </SettingsControlRow>
      </SettingsSection>
      <SettingsSection title="Skala">
        <SettingsControlRow
          label="Wielkość czcionki"
          controlClassName="ll:w-40"
        >
          <Slider
            min={8}
            max={16}
            step={0.5}
            value={[displayConfig.fontSize]}
            onValueChange={(value) =>
              setDisplayConfig({ ...displayConfig, fontSize: value[0] })
            }
          />
        </SettingsControlRow>
        <SettingsControlRow
          label="Minimalna szerokość pojedynczego timera"
          controlClassName="ll:w-40"
        >
          <Slider
            min={0}
            max={240}
            step={1}
            value={[displayConfig.minColumnWidth]}
            onValueChange={(value) =>
              setDisplayConfig({
                ...displayConfig,
                minColumnWidth: value[0],
              })
            }
          />
        </SettingsControlRow>
      </SettingsSection>
    </div>
  );
};
