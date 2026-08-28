import type { ThemeConfigV1 } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { WandSparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeBuilderColorField } from "./theme-builder-color-field";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import type {
  ThemeBuilderAxis,
  ThemeBuilderControlGroupProps,
} from "./theme-builder-types";

const BASIC_PALETTE_TOKENS = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "border",
  "ring",
] as const satisfies readonly (keyof ThemeConfigV1["tokens"])[];

const ADVANCED_PALETTE_TOKENS = [
  ...BASIC_PALETTE_TOKENS,
  "popover",
  "popoverForeground",
  "muted",
  "mutedForeground",
  "destructive",
  "destructiveForeground",
  "input",
  "sidebar",
  "sidebarForeground",
  "sidebarPrimary",
  "sidebarPrimaryForeground",
  "sidebarAccent",
  "sidebarAccentForeground",
  "sidebarBorder",
  "sidebarRing",
  "signalLive",
  "signalReady",
  "signalTimer",
  "signalAlert",
] as const satisfies readonly (keyof ThemeConfigV1["tokens"])[];

const INTERACTION_TOKENS = [
  "primaryHover",
  "primaryActive",
  "secondaryHover",
  "secondaryActive",
  "neutralHover",
  "neutralActive",
  "destructiveHover",
  "destructiveActive",
  "surfaceHover",
  "surfaceSelected",
  "inputHover",
  "inputFocus",
  "sidebarHover",
  "sidebarActive",
  "shadow",
] as const satisfies readonly (keyof ThemeConfigV1["tokens"])[];

interface ThemeBuilderTokenControlsProps extends ThemeBuilderControlGroupProps {
  advanced: boolean;
  axis: Extract<ThemeBuilderAxis, "colors" | "interactions">;
  search: string;
  onGeneratePalette: () => void;
}

export const ThemeBuilderTokenControls = ({
  advanced,
  axis,
  config,
  lockedAxes,
  search,
  onConfigChange,
  onGeneratePalette,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderTokenControlsProps) => {
  const { t } = useTranslation();
  const paletteTokens = advanced
    ? ADVANCED_PALETTE_TOKENS
    : BASIC_PALETTE_TOKENS;
  const sourceTokens = axis === "colors" ? paletteTokens : INTERACTION_TOKENS;
  const normalizedSearch = search.trim().toLocaleLowerCase("pl");
  const tokens = sourceTokens.filter((token) => {
    const label = t(`settings.appearance.options.tokens.${token}`);
    return `${token} ${label}`
      .toLocaleLowerCase("pl")
      .includes(normalizedSearch);
  });
  const title = t(`settings.appearance.builder.${axis}`);

  return (
    <ThemeBuilderControlSection
      axis={axis}
      title={title}
      description={t(`settings.appearance.builder.${axis}Description`)}
      isLocked={lockedAxes.has(axis)}
      onReset={() => onResetGroup(axis)}
      onToggleLock={() => onToggleLock(axis)}
    >
      {axis === "colors" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center"
          onClick={onGeneratePalette}
        >
          <WandSparkles />
          {t("settings.appearance.builder.generatePalette")}
        </Button>
      ) : null}
      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        {tokens.map((token) => (
          <ThemeBuilderColorField
            key={token}
            token={token}
            label={t(`settings.appearance.options.tokens.${token}`)}
            value={config.tokens[token]}
            advanced={advanced}
            onChange={(value) =>
              onConfigChange({
                ...config,
                tokens: { ...config.tokens, [token]: value },
              })
            }
          />
        ))}
      </div>
    </ThemeBuilderControlSection>
  );
};
