import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import upperFirst from "lodash/upperFirst";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import {
  activityLevel,
  calendarOffset,
  type ActivityDay,
} from "./activity-calendar";

const fullDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "full",
  timeZone: "Europe/Warsaw",
});
const weekdayFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  timeZone: "Europe/Warsaw",
});
const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "short",
  timeZone: "Europe/Warsaw",
});

const levels = {
  unknown: "bg-muted/30 border border-dashed border-muted-foreground/50",
  zero: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

type ActivityHeatmapProps = {
  days: ActivityDay[];
  label: string;
  fill?: boolean;
  showDetails?: boolean;
  unknownDisplay?: "distinct" | "lowest";
  formatValue: (value: number) => string;
};

export function ActivityHeatmap({
  days,
  label,
  formatValue,
  fill = false,
  showDetails = true,
  unknownDisplay = "distinct",
}: ActivityHeatmapProps) {
  const { t } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const [focused, setFocused] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>();
  const selected = days.find((day) => day.date === selectedDate);
  const activeIndex = Math.min(focused ?? days.length - 1, days.length - 1);
  const lastDate = days[days.length - 1]?.date;
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [lastDate, days.length]);
  const maximum = Math.max(1, ...days.map(({ value }) => value ?? 0));
  const offset = days[0] ? calendarOffset(days[0].date) : 0;
  const describe = (day: ActivityDay) => {
    const date = fullDateFormatter.format(new Date(`${day.date}T12:00:00Z`));
    const value =
      day.value === null ? t("statistics.unknown") : formatValue(day.value);
    const details = [
      `${date}: ${value}${day.partial ? ` · ${t("statistics.partialDay")}` : ""}`,
    ];
    if (day.worlds?.length) {
      details.push(
        t("statistics.sourceWorlds", {
          worlds: day.worlds.map(upperFirst).join(", "),
        }),
      );
    }
    if (day.worldsComplete === false) {
      details.push(t("statistics.sourceWorldsIncomplete"));
    }
    return details.join("\n");
  };
  return (
    <div
      className={cn(
        "min-w-0",
        fill ? "flex min-h-0 flex-1 flex-col gap-2" : "space-y-2",
      )}
    >
      <ScrollArea
        ref={scroller}
        orientation="horizontal"
        className={cn("min-w-0 pb-2", fill && "shrink-0")}
        role="group"
        aria-label={label}
      >
        <div
          className={cn("grid gap-1", "w-max")}
          style={{
            gridTemplateColumns: `2rem repeat(${Math.ceil((days.length + offset) / 7)}, ${fill ? "var(--activity-cell, 20px)" : "20px"})`,
            gridTemplateRows: `20px repeat(7, ${fill ? "var(--activity-cell, 20px)" : "20px"})`,
          }}
        >
          {Array.from({ length: 7 }, (_, weekday) => (
            <span
              key={`weekday-${weekday}`}
              aria-hidden
              className="sticky left-0 z-10 flex items-center justify-end bg-card pr-1 text-[10px] text-muted-foreground"
              style={{ gridColumn: 1, gridRow: weekday + 2 }}
            >
              {weekdayFormatter.format(
                new Date(Date.UTC(2026, 0, 5 + weekday, 12)),
              )}
            </span>
          ))}
          {days.map((day, index) => (
            <div key={day.date} className="contents">
              {(day.date.endsWith("-01") ||
                (index === 0 && Number(day.date.slice(8)) <= 24)) && (
                <span
                  aria-hidden
                  className="text-[10px] text-muted-foreground"
                  style={{
                    gridColumn: Math.floor((index + offset) / 7) + 2,
                    gridRow: 1,
                  }}
                >
                  {monthFormatter.format(new Date(`${day.date}T12:00:00Z`))}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={<button type="button" />}
                  ref={(element) => {
                    if (element) buttons.current.set(index, element);
                    else buttons.current.delete(index);
                  }}
                  aria-label={describe(day)}
                  tabIndex={activeIndex === index ? 0 : -1}
                  className={cn(
                    "block size-full rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    levels[
                      activityLevel(
                        unknownDisplay === "lowest"
                          ? (day.value ?? 0)
                          : day.value,
                        maximum,
                      )
                    ],
                  )}
                  style={{
                    gridColumn: Math.floor((index + offset) / 7) + 2,
                    gridRow: ((index + offset) % 7) + 2,
                  }}
                  onFocus={() => setFocused(index)}
                  onClick={
                    showDetails ? () => setSelectedDate(day.date) : undefined
                  }
                  onKeyDown={(event) => {
                    const moves: Record<string, number> = {
                      ArrowRight: 7,
                      ArrowLeft: -7,
                      ArrowDown: 1,
                      ArrowUp: -1,
                    };
                    let next = index + (moves[event.key] ?? 0);
                    if (event.key === "Home") next = 0;
                    if (event.key === "End") next = days.length - 1;
                    if (next === index) return;
                    event.preventDefault();
                    buttons.current
                      .get(Math.max(0, Math.min(days.length - 1, next)))
                      ?.focus();
                  }}
                />
                <TooltipContent className="max-w-72 whitespace-pre-line">
                  {describe(day)}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </ScrollArea>
      {showDetails && (
        <p
          className={cn(
            "text-xs text-muted-foreground",
            fill ? "h-8 shrink-0" : "min-h-4",
          )}
          aria-live="polite"
        >
          {selected ? describe(selected) : t("statistics.heatmapHint")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{t("statistics.less")}</span>
        {(["zero", 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            aria-hidden
            className={cn("size-3 rounded-sm", levels[level])}
          />
        ))}
        <span>{t("statistics.more")}</span>
        {unknownDisplay === "distinct" && (
          <>
            <span
              aria-hidden
              className={cn("ml-2 size-3 rounded-sm", levels.unknown)}
            />
            <span>{t("statistics.unknown")}</span>
          </>
        )}
      </div>
    </div>
  );
}
