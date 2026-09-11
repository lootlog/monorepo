import { SettingsColorRow } from "@/components/settings/settings-color-row";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { ChevronRight, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getTimerColorHex } from "./color-utils";

interface HiddenColorsListProps {
  hiddenColors: string[];
  colorNames: Record<string, string>;
  onRestore: (colorId: string) => void;
}

/** Collapsed list of hidden default colours with a restore action each. */
export const HiddenColorsList: FC<HiddenColorsListProps> = ({
  hiddenColors,
  colorNames,
  onRestore,
}) => {
  const { t } = useTranslation();

  if (hiddenColors.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger className="ll-custom-cursor-pointer ll:group/hidden-colors ll:flex ll:items-center ll:gap-1 ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-2 ll:py-1 ll:text-[11px] ll:text-muted-foreground ll:outline-none ll:hover:text-foreground ll:focus-visible:ring-1 ll:focus-visible:ring-ring">
        <ChevronRight className="ll:size-3.5 ll:transition-transform ll:group-data-[panel-open]/hidden-colors:rotate-90" />
        {t("settings.timers.colors.hiddenCount", {
          count: hiddenColors.length,
        })}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ll:flex ll:flex-col ll:gap-0.5">
          {hiddenColors.map((colorId) => {
            const hex = getTimerColorHex(colorId);
            const name = colorNames[colorId] ?? getDefaultColorName(colorId);
            const restoreLabel = `${t("settings.timers.colors.restoreColorTitle")}: ${name}`;

            return (
              <SettingsColorRow
                key={colorId}
                className="ll:opacity-70"
                name={name}
                borderColor={hex?.border ?? "#9ca3af"}
                backgroundColor={hex?.background ?? "#9ca3af33"}
              >
                <SettingsIconButton
                  label={restoreLabel}
                  onClick={() => onRestore(colorId)}
                >
                  <RotateCcw />
                </SettingsIconButton>
              </SettingsColorRow>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
