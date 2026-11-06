import { cn } from "cn";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TIMER_TOOLTIP_MAX_ROWS } from "../constants/timer-tooltip";

const LIST_CLASS_NAME =
  "ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-0.5 ll:p-0";

const ROW_CLASS_NAME = "ll:grid ll:grid-cols-[minmax(0,1fr)_auto] ll:gap-x-2";

/**
 * The players or enemies of a timer tooltip: the first rows and a count of
 * the rest, which unfold once the player keeps the tooltip open.
 */
export function TimerTooltipRows<Item>({
  items,
  expanded,
  getKey,
  getRowClassName,
  renderRow,
}: {
  items: readonly Item[];
  expanded: boolean;
  getKey: (item: Item) => string | number;
  getRowClassName?: (item: Item) => string | undefined;
  renderRow: (item: Item) => ReactNode;
}) {
  const { t } = useTranslation("timers");
  const shown = items.slice(0, TIMER_TOOLTIP_MAX_ROWS);
  const rest = items.slice(TIMER_TOOLTIP_MAX_ROWS);

  return (
    <>
      <ul className={LIST_CLASS_NAME}>
        {shown.map((item) => (
          <li
            key={getKey(item)}
            className={cn(ROW_CLASS_NAME, getRowClassName?.(item))}
          >
            {renderRow(item)}
          </li>
        ))}
      </ul>
      {rest.length > 0 &&
        (expanded ? (
          <div className="ll-timer-tooltip-reveal ll:-mt-0.5">
            <ul
              className={cn(LIST_CLASS_NAME, "ll:min-h-0 ll:overflow-hidden")}
            >
              {rest.map((item, index) => (
                <li
                  key={getKey(item)}
                  className={cn(
                    ROW_CLASS_NAME,
                    "ll-timer-tooltip-reveal-row",
                    getRowClassName?.(item),
                  )}
                  // SAFETY: CSSProperties has no index signature for custom
                  // properties; the reveal row animation reads this one.
                  style={{ "--ll-reveal-index": index } as CSSProperties}
                >
                  {renderRow(item)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <span className="ll:text-muted-foreground">
            {t("tooltip.more", { count: rest.length })}
          </span>
        ))}
    </>
  );
}
