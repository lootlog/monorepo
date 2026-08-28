import type { ReactNode } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Lock, RotateCcw, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ThemeBuilderAxis } from "./theme-builder-types";

interface ThemeBuilderControlSectionProps {
  axis: ThemeBuilderAxis;
  children: ReactNode;
  description?: string;
  isLocked: boolean;
  title: string;
  onReset: () => void;
  onToggleLock: () => void;
}

export const ThemeBuilderControlSection = ({
  axis,
  children,
  description,
  isLocked,
  title,
  onReset,
  onToggleLock,
}: ThemeBuilderControlSectionProps) => {
  const { t } = useTranslation();

  return (
    <section
      className="space-y-3 border-b border-border pb-5"
      data-builder-axis={axis}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={onReset}
            aria-label={t("settings.appearance.builder.resetGroup", { title })}
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={onToggleLock}
            aria-label={
              isLocked
                ? t("settings.appearance.builder.unlockAxis")
                : t("settings.appearance.builder.lockAxis")
            }
            aria-pressed={isLocked}
          >
            {isLocked ? <Lock /> : <Unlock />}
          </Button>
        </div>
      </div>
      {children}
    </section>
  );
};
