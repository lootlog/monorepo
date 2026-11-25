import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { t } from "@/i18n/messages";
import {
  FIGHT_OUTCOMES,
  fightOutcome,
  type FightListView,
  type FightOutcome,
  type FightSortKey,
} from "@/lib/fight/fight-list";
import type { FightRecord } from "@/lib/fight/fight-summary";
import { FIGHT_LIST_COLUMNS, FightListRow } from "./fight-list-row";

const PAGE_SIZE = 200;

const SORT_COLUMNS: readonly { key: FightSortKey; align: string }[] = [
  { key: "index", align: "justify-start" },
  { key: "moves", align: "justify-end" },
  { key: "myHp", align: "justify-end" },
  { key: "theirHp", align: "justify-end" },
];

const isOutcome = (value: unknown): value is FightOutcome =>
  FIGHT_OUTCOMES.some((outcome) => outcome === value);

type FightListProps = {
  fights: readonly FightRecord[];
  order: readonly number[];
  view: FightListView;
  onViewChange: (view: FightListView) => void;
  selected: number | null;
  onSelect: (index: number) => void;
};

export function FightList({
  fights,
  order,
  view,
  onViewChange,
  selected,
  onSelect,
}: FightListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const selectedPosition = selected === null ? -1 : order.indexOf(selected);
  const shown = order.slice(0, Math.max(limit, selectedPosition + 1));

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- scrolls the list viewport to the fight picked from outside it
  useEffect(() => {
    scrollRef.current
      ?.querySelector(`[data-fight="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const showMoreNearEnd = (scroller: HTMLDivElement) => {
    const remaining =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;

    if (remaining < scroller.clientHeight && shown.length < order.length)
      setLimit(shown.length + PAGE_SIZE);
  };

  const counts: Record<FightOutcome, number> = { won: 0, lost: 0, drawn: 0 };

  for (const fight of fights) counts[fightOutcome(fight.winner)] += 1;

  const sortBy = (key: FightSortKey) =>
    onViewChange({
      ...view,
      sort: {
        key,
        descending: view.sort.key === key ? !view.sort.descending : true,
      },
    });

  const SortIcon = view.sort.descending ? ArrowDown : ArrowUp;

  return (
    <SectionCard
      aria-labelledby="fight-list"
      className="flex h-full min-h-0 flex-col"
    >
      <SectionCardHeader
        id="fight-list"
        title={t("fightPage.fightsTitle")}
        actions={
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("fightPage.fightsCount", {
              shown: formatNumber(order.length),
              runs: formatNumber(fights.length),
            })}
          </span>
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <ToggleGroup
          aria-label={t("fightPage.outcomeFilter")}
          variant="outline"
          size="sm"
          spacing={1}
          className="flex-wrap"
          value={[view.outcome ?? "all"]}
          onValueChange={([pressed]) =>
            onViewChange({
              ...view,
              outcome: isOutcome(pressed) ? pressed : null,
            })
          }
        >
          <ToggleGroupItem value="all">
            {t("fightPage.allFights")}
          </ToggleGroupItem>
          {FIGHT_OUTCOMES.map((outcome) => (
            <ToggleGroupItem key={outcome} value={outcome}>
              {t(`fightPage.${outcome}`)}
              <span className="text-muted-foreground tabular-nums">
                {formatNumber(counts[outcome])}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {view.lengths ? (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => onViewChange({ ...view, lengths: null })}
            aria-label={t("fightPage.clearLengthFilter", {
              range: t("fightPage.lengthBucket", {
                from: formatNumber(view.lengths.from),
                to: formatNumber(view.lengths.to),
              }),
            })}
          >
            {t("fightPage.lengthBucket", {
              from: formatNumber(view.lengths.from),
              to: formatNumber(view.lengths.to),
            })}
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          FIGHT_LIST_COLUMNS,
          "h-8 shrink-0 border-b border-border/70 bg-secondary/45 text-xs font-semibold text-muted-foreground",
        )}
      >
        {SORT_COLUMNS.map((column, position) => (
          <button
            key={column.key}
            type="button"
            onClick={() => sortBy(column.key)}
            aria-label={t("fightPage.sortBy", {
              column: t(`fightPage.columns.${column.key}`),
            })}
            className={cn(
              "flex min-w-0 items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              column.align,
              position === 1 && "col-start-3",
              view.sort.key === column.key && "text-foreground",
            )}
          >
            <span className="truncate">
              {t(`fightPage.columns.${column.key}`)}
            </span>
            {view.sort.key === column.key ? (
              <SortIcon aria-hidden="true" className="size-3 shrink-0" />
            ) : null}
          </button>
        ))}
        <span className="col-start-2 row-start-1">
          {t("fightPage.columns.outcome")}
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={(event) => showMoreNearEnd(event.currentTarget)}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {order.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {t("fightPage.noFights")}
          </p>
        ) : (
          <ul aria-label={t("fightPage.fightsTitle")}>
            {shown.map((index) => {
              const fight = fights[index];

              return fight ? (
                <FightListRow
                  key={index}
                  index={index}
                  fight={fight}
                  isSelected={index === selected}
                  onSelect={onSelect}
                />
              ) : null;
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
