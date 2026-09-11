import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { stripAlphaChannel, alphaToHex } from "./color-utils";

interface AddColorFormProps {
  onAdd: (data: {
    name: string;
    borderColor: string;
    backgroundColor: string;
  }) => void;
}

const DEFAULT_COLOR = "#3b82f6";

const DEFAULT_ALPHA = 20;

const COLOR_INPUT_CLASS_NAME =
  "ll:h-7 ll:w-8 ll:border-border ll:p-0.5 ll:text-popover-foreground";

export const AddColorForm: FC<AddColorFormProps> = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [borderColor, setBorderColor] = useState(DEFAULT_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_COLOR);
  const [backgroundAlpha, setBackgroundAlpha] = useState(DEFAULT_ALPHA);
  const { t } = useTranslation();
  const bgWithAlpha = `${backgroundColor}${alphaToHex(backgroundAlpha)}`;

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), borderColor, backgroundColor: bgWithAlpha });
    setName("");
    setBorderColor(DEFAULT_COLOR);
    setBackgroundColor(DEFAULT_COLOR);
    setBackgroundAlpha(DEFAULT_ALPHA);
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <SettingsSectionHeader
        as="h4"
        className="ll:px-0"
        title={t("settings.timers.colors.addTitle")}
      />

      <div className="ll:flex ll:flex-col ll:-mx-2">
        <SettingsRow
          htmlFor="add-color-name"
          label={t("settings.timers.colors.nameLabel")}
          control="wide"
        >
          <Input
            id="add-color-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.timers.colors.namePlaceholder")}
            className="ll:border-border ll:text-popover-foreground"
          />
        </SettingsRow>
        <SettingsRow
          htmlFor="add-color-border"
          label={t("settings.timers.colors.borderLabel")}
        >
          <Input
            id="add-color-border"
            type="color"
            value={stripAlphaChannel(borderColor)}
            onChange={(e) => setBorderColor(e.target.value)}
            className={COLOR_INPUT_CLASS_NAME}
            aria-label={t("settings.timers.colors.borderAria")}
          />
        </SettingsRow>
        <SettingsRow
          htmlFor="add-color-background"
          label={t("settings.timers.colors.backgroundLabel")}
        >
          <Input
            id="add-color-background"
            type="color"
            value={stripAlphaChannel(backgroundColor)}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className={COLOR_INPUT_CLASS_NAME}
            aria-label={t("settings.timers.colors.backgroundAria")}
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.timers.colors.transparencyLabel")}
          control="wide"
        >
          <SettingsSliderField
            min={0}
            max={100}
            step={1}
            unit="%"
            value={backgroundAlpha}
            aria-label={t("settings.timers.colors.transparencyAria")}
            onValueChange={setBackgroundAlpha}
            onCommit={setBackgroundAlpha}
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.timers.colors.previewLabel")}
          control="wide"
        >
          <TimerTileView
            customBorderColor={borderColor}
            customBackgroundColor={bgWithAlpha}
            displayMode="row"
            fontSize={10}
            label={t("common:preview.name")}
            timeLabel={t("common:preview.time")}
          />
        </SettingsRow>
      </div>

      <div className="ll:flex ll:justify-end ll:pt-1">
        <Button size="sm" onClick={handleAdd} disabled={!name.trim()}>
          {t("settings.timers.colors.addButton")}
        </Button>
      </div>
    </div>
  );
};
