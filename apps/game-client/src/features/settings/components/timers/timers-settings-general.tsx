import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import { type FC, useState } from "react";

const MAX_REMOVE_TIMER_AFTER_MS = 120000; // 2 minutes

export const TimersSettingsGeneral: FC = () => {
  const { generalConfig, setGeneralConfig, syncEnabled, setSyncEnabled } =
    useTimersStore();

  const [inputValue, setInputValue] = useState<string>(
    (generalConfig.removeTimerAfterMs / 1000).toString(),
  );

  const handleRemoveTimerAfterMsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setInputValue(value);

    if (value === "") {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });
      return;
    }

    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num)) {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });
      return;
    }

    if (num < 0 || num > MAX_REMOVE_TIMER_AFTER_MS / 1000) {
      setGeneralConfig({
        ...generalConfig,
        removeTimerAfterMs: MAX_REMOVE_TIMER_AFTER_MS,
      });
      setInputValue((MAX_REMOVE_TIMER_AFTER_MS / 1000).toString());
      return;
    }

    setGeneralConfig({ ...generalConfig, removeTimerAfterMs: num * 1000 });
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <SettingsSection title="Zachowanie">
        <SettingsControlRow
          label="Synchronizuj ustawienia"
          description="Synchronizuje ustawienia timerów z serwerem."
        >
          <Switch
            checked={syncEnabled ?? true}
            onCheckedChange={setSyncEnabled}
            id="sync-enabled"
          />
        </SettingsControlRow>
        <SettingsControlRow
          label="Grupuj timery"
          description="Łączy timery z różnych lootlogów w jeden zbiorczy."
        >
          <Switch
            checked={generalConfig.timersGrouping}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, timersGrouping: value })
            }
            id="timers-grouping"
          />
        </SettingsControlRow>
        <SettingsControlRow
          label="Timery pod torbami"
          description="Wyświetla timery pod torbami zamiast w osobnym okienku."
        >
          <Switch
            checked={generalConfig.timersUnderBag}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, timersUnderBag: value })
            }
            id="timers-under-bag"
          />
        </SettingsControlRow>
        <SettingsControlRow
          label="Widok kompaktowy"
          description="Ukrywa nagłówek i stopkę timerów, pokazując tylko zawartość."
        >
          <Switch
            checked={generalConfig.compactView}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, compactView: value })
            }
            id="compact-view"
          />
        </SettingsControlRow>
      </SettingsSection>
      <SettingsSection title="Tryb odliczania">
        <SettingsControlRow
          label="Odliczaj do"
          description="Wybierz, czy licznik ma odliczać do minimalnego czy maksymalnego czasu."
          controlClassName="ll:w-28"
        >
          <ToggleGroup
            type="single"
            size="xs"
            onValueChange={(value: "min" | "max") => {
              if (value) {
                setGeneralConfig({
                  ...generalConfig,
                  countdownMode: value,
                });
              }
            }}
            value={generalConfig.countdownMode}
          >
            <ToggleGroupItem value="max">Max</ToggleGroupItem>
            <ToggleGroupItem value="min" className="ll:text-nowrap">
              Min
            </ToggleGroupItem>
          </ToggleGroup>
        </SettingsControlRow>
      </SettingsSection>
      <SettingsSection title="Wygaszanie">
        <SettingsControlRow
          label="Czas usunięcia timera po wyzerowaniu"
          description="W sekundach."
          controlClassName="ll:w-10"
        >
          <Input
            type="text"
            value={inputValue}
            max={120}
            onChange={handleRemoveTimerAfterMsChange}
          />
        </SettingsControlRow>
      </SettingsSection>
    </div>
  );
};
