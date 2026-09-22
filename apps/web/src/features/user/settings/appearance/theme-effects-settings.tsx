import { useId, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Switch } from "@lootlog/ui/components/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import {
  THEME_EFFECTS_LEVELS,
  useThemeEffects,
  type ThemeEffectsLevel,
} from "@/themes";

const isLevel = (value: unknown): value is ThemeEffectsLevel =>
  THEME_EFFECTS_LEVELS.some((level) => level === value);

export const ThemeEffectsSettings: FC = () => {
  const { t } = useTranslation();
  const { settings, setThemeEffects } = useThemeEffects();
  const levelId = useId();
  const pauseId = useId();

  return (
    <SectionCard>
      <SectionCardHeader
        icon={Sparkles}
        title={t("settings.appearance.effects.title")}
      />
      <SectionCardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1 basis-64">
            <p id={levelId} className="text-sm font-medium">
              {t("settings.appearance.effects.levelLabel")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.appearance.effects.levelDescription")}
            </p>
          </div>
          <ToggleGroup
            aria-labelledby={levelId}
            variant="outline"
            spacing={0}
            value={[settings.level]}
            onValueChange={(value) => {
              const next = value[0];

              if (isLevel(next)) setThemeEffects({ level: next });
            }}
          >
            {THEME_EFFECTS_LEVELS.map((level) => (
              <ToggleGroupItem key={level} value={level}>
                {t(`settings.appearance.effects.levels.${level}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor={pauseId} className="text-sm font-medium">
              {t("settings.appearance.effects.pauseUnfocusedLabel")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("settings.appearance.effects.pauseUnfocusedDescription")}
            </p>
          </div>
          <Switch
            id={pauseId}
            checked={settings.pauseWhenUnfocused}
            disabled={settings.level === "off"}
            onCheckedChange={(checked) =>
              setThemeEffects({ pauseWhenUnfocused: checked })
            }
          />
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
