import { useState } from "react";
import type { ThemeConfigV1 } from "@lootlog/types";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";
import { Switch } from "@lootlog/ui/components/switch";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeBuilderChartControls } from "./theme-builder-chart-controls";
import { ThemeBuilderComponentControls } from "./theme-builder-component-controls";
import { ThemeBuilderMotionControls } from "./theme-builder-motion-controls";
import { ThemeBuilderNavigationControls } from "./theme-builder-navigation-controls";
import { ThemeBuilderStructureControls } from "./theme-builder-structure-controls";
import { ThemeBuilderTokenControls } from "./theme-builder-token-controls";
import { ThemeBuilderTypographyControls } from "./theme-builder-typography-controls";
import type { ThemeBuilderAxis } from "./theme-builder-types";

interface ThemeBuilderControlsProps {
  name: string;
  config: ThemeConfigV1;
  lockedAxes: Set<ThemeBuilderAxis>;
  onNameChange: (name: string) => void;
  onConfigChange: (config: ThemeConfigV1) => void;
  onGeneratePalette: () => void;
  onResetGroup: (axis: ThemeBuilderAxis) => void;
  onToggleLock: (axis: ThemeBuilderAxis) => void;
}

export const ThemeBuilderControls = ({
  name,
  config,
  lockedAxes,
  onNameChange,
  onConfigChange,
  onGeneratePalette,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlsProps) => {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const groupProps = {
    config,
    lockedAxes,
    onConfigChange,
    onResetGroup,
    onToggleLock,
  };

  return (
    <div className="space-y-5 pb-24">
      <Field>
        <FieldLabel htmlFor="theme-name">
          {t("settings.appearance.builder.name")}
        </FieldLabel>
        <Input
          id="theme-name"
          value={name}
          maxLength={48}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
        <div>
          <p className="text-sm font-medium">
            {t("settings.appearance.builder.advanced")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("settings.appearance.builder.advancedDescription")}
          </p>
        </div>
        <Switch
          checked={advanced}
          onCheckedChange={setAdvanced}
          aria-label={t("settings.appearance.builder.advanced")}
        />
      </div>

      {advanced ? (
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("settings.appearance.builder.searchControls")}
            className="pl-9"
          />
          <span className="sr-only">
            {t("settings.appearance.builder.searchControls")}
          </span>
        </label>
      ) : null}

      <ThemeBuilderTokenControls
        {...groupProps}
        axis="colors"
        advanced={advanced}
        search={search}
        onGeneratePalette={onGeneratePalette}
      />
      <ThemeBuilderTokenControls
        {...groupProps}
        axis="interactions"
        advanced={advanced}
        search={search}
        onGeneratePalette={onGeneratePalette}
      />
      <ThemeBuilderComponentControls {...groupProps} />
      <ThemeBuilderStructureControls {...groupProps} />
      <ThemeBuilderTypographyControls {...groupProps} />
      <ThemeBuilderNavigationControls {...groupProps} />
      <ThemeBuilderChartControls {...groupProps} />
      <ThemeBuilderMotionControls {...groupProps} />
    </div>
  );
};
