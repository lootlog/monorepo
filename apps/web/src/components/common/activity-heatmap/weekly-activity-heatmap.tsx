import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { clamp } from "es-toolkit";
import { cn } from "cn";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { activityLevel, activityLevelClasses } from "./activity-calendar";
import { formatIsoWeekday } from "@/components/common/kill-analytics/format-statistics-date";
import { ActivityLegend } from "./activity-legend";

/** Kills in one hour of one ISO weekday (1 = Monday), in Warsaw time. */
type WeeklyActivityCell = { weekday: number; hour: number; kills: number };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const MOVES = new Map([
  ["ArrowRight", 1],
  ["ArrowLeft", -1],
  ["ArrowDown", 24],
  ["ArrowUp", -24],
]);

type WeeklyActivityHeatmapProps = {
  cells: WeeklyActivityCell[];
  label: string;
};

/** Activity by weekday (rows) and hour (columns), on the activity heatmap scale. */
export function WeeklyActivityHeatmap({
  cells,
  label,
}: WeeklyActivityHeatmapProps) {
  const { t } = useTranslation();
  const buttons = useRef(new Map<number, HTMLButtonElement>());

  const kills = new Map(
    cells.map((cell) => [(cell.weekday - 1) * 24 + cell.hour, cell.kills]),
  );

  const maximum = Math.max(1, ...kills.values());

  const peakIndex =
    [...kills.entries()].find(([, value]) => value === maximum)?.[0] ?? 0;

  const [focused, setFocused] = useState<number | null>(null);
  const activeIndex = focused ?? peakIndex;

  const describe = (index: number) =>
    t("statistics.hourCell", {
      weekday: formatIsoWeekday(Math.floor(index / 24) + 1),
      hour: `${index % 24}:00`,
      count: kills.get(index) ?? 0,
    });

  return (
    <div className="min-w-0 space-y-2">
      <ScrollArea
        orientation="horizontal"
        className="min-w-0 pb-2"
        role="group"
        aria-label={label}
      >
        <div className="grid min-w-[18rem] max-w-[50rem] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]">
          <span aria-hidden />
          {HOURS.map((hour) => (
            <span
              key={hour}
              aria-hidden
              className="flex justify-center whitespace-nowrap text-[10px] text-muted-foreground tabular-nums"
            >
              {hour % 3 === 0 ? `${hour}:00` : ""}
            </span>
          ))}
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="contents">
              <span
                aria-hidden
                className="flex items-center pr-1 text-[10px] text-muted-foreground"
              >
                {formatIsoWeekday(weekday, true)}
              </span>
              {HOURS.map((hour) => {
                const index = (weekday - 1) * 24 + hour;
                const value = kills.get(index) ?? 0;

                return (
                  <Tooltip key={hour}>
                    <TooltipTrigger
                      render=<button type="button" />
                      ref={(element) => {
                        if (element) buttons.current.set(index, element);
                        else buttons.current.delete(index);
                      }}
                      aria-label={describe(index)}
                      tabIndex={activeIndex === index ? 0 : -1}
                      className={cn(
                        "block aspect-square w-full cursor-default rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        activityLevelClasses[activityLevel(value, maximum)],
                        index === peakIndex &&
                          value > 0 &&
                          "ring-1 ring-foreground/80",
                      )}
                      onFocus={() => setFocused(index)}
                      onKeyDown={(event) => {
                        const row = index - (index % 24);
                        let next = index + (MOVES.get(event.key) ?? 0);

                        if (event.key === "Home") next = row;

                        if (event.key === "End") next = row + 23;

                        if (next === index) return;
                        event.preventDefault();
                        buttons.current.get(clamp(next, 0, 167))?.focus();
                      }}
                    />
                    <TooltipContent>{describe(index)}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
      <ActivityLegend />
    </div>
  );
}
