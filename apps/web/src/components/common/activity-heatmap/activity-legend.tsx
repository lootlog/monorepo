import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { activityLevelClasses } from "./activity-calendar";

/** "Less … more" scale under an activity heatmap. */
export function ActivityLegend({
  showUnknown = false,
}: {
  showUnknown?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{t("statistics.less")}</span>
      {(["zero", 1, 2, 3, 4] as const).map((level) => (
        <span
          key={level}
          aria-hidden
          className={cn("size-3 rounded-[3px]", activityLevelClasses[level])}
        />
      ))}
      <span>{t("statistics.more")}</span>
      {showUnknown && (
        <>
          <span
            aria-hidden
            className={cn(
              "ml-2 size-3 rounded-[3px]",
              activityLevelClasses.unknown,
            )}
          />
          <span>{t("statistics.unknown")}</span>
        </>
      )}
    </div>
  );
}
