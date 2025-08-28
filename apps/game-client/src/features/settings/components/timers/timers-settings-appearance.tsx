import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import { FC } from "react";

export const TimersSettingsAppearance: FC = () => {
  const { displayConfig, setDisplayConfig } = useTimersStore();

  return (
    <span className="ll-flex ll-flex-col ll-gap-3">
      <div className="ll-flex ll-flex-col ll-gap-2">
        <Label htmlFor="show-level">Wyświetlaj poziom potwora</Label>
        <Switch
          checked={displayConfig.showLevel}
          onCheckedChange={(checked) => {
            setDisplayConfig({ ...displayConfig, showLevel: checked });
          }}
          id="show-level"
        />
      </div>
      <div className="ll-flex ll-flex-col ll-gap-2">
        <Label htmlFor="show-type">Wyświetlaj typ potwora</Label>
        <Switch
          checked={displayConfig.showType}
          onCheckedChange={(checked) => {
            setDisplayConfig({ ...displayConfig, showType: checked });
          }}
          id="show-type"
        />
      </div>

      <span className="ll-space-y-2">
        <div>
          <Label htmlFor="show-type">
            Tryb wyświetlania pojedynczego timera
          </Label>
          <p className="ll-text-muted-foreground">
            Kolumny - wyświetla czas pod nazwą timera. <br /> Wiersze -
            wyświetla czas obok nazwy timera.
          </p>
        </div>
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
      </span>
      <span className="ll-space-y-2">
        <Label>Wielkość czcionki</Label>
        <Slider
          min={8}
          max={16}
          step={0.5}
          value={[displayConfig.fontSize]}
          onValueChange={(value) =>
            setDisplayConfig({ ...displayConfig, fontSize: value[0] })
          }
        />
      </span>
      <span className="ll-space-y-2">
        <Label>Minimalna szerokość pojedynczego timera</Label>
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
      </span>
    </span>
  );
};
