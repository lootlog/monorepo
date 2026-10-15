import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type ThemeSettingRowProps = {
  label: string;
  labelId?: string;
  description?: string;
  /** The control, such as a colour field or a slider. */
  children: ReactNode;
  /** Set while the value differs from the base theme's; restores it. */
  onReset?: () => void;
};

/** One setting of a theme: its name, its control, and a way back. */
export const ThemeSettingRow = ({
  label,
  labelId,
  description,
  children,
  onReset,
}: ThemeSettingRowProps) => {
  const { t } = useTranslation();

  return (
    <li
      data-list-tile
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5",
        LIST_TILE_RULE_CLASS,
        LIST_TILE_INSET_CLASS,
      )}
    >
      <span className="flex min-w-40 flex-1 flex-col gap-0.5">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        {description && (
          <span className="text-xs leading-tight text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {children}
        {/* The slot keeps every row's control aligned whether or not it changed. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon=<RotateCcw className="size-4" />
          aria-label={t("settings.appearance.editor.resetLabel", {
            name: label,
          })}
          className={cn(!onReset && "invisible")}
          onClick={onReset}
        >
          <span className="max-sm:sr-only">
            {t("settings.appearance.editor.reset")}
          </span>
        </Button>
      </span>
    </li>
  );
};
