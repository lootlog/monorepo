import { useEffect, useRef, useState, type ReactNode } from "react";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { Battle } from "@/lib/api/battlelog-types";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { StatsCustomizationModal } from "./stats-customization/stats-customization-modal";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useTranslation } from "react-i18next";
import type {
  BattleStatDefinition,
  BattleStatCategoryDefinition,
  StatsCustomizationConfig,
} from "@/types/stats-customization.types";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { SearchInput } from "@/components/ui/search-input";
import { STAT_CATEGORIES } from "./one-vs-one-stats-definitions";
import { BATTLE_SURFACE_COLORS } from "./utils/battle-color-palette";

const STAT_SEARCH_SCROLL_OFFSET_PX = 40;

interface OneVsOneStatsTableProps {
  battle: Battle;
  cardClassName?: string;
  compact?: boolean;
  scrollClassName?: string;
  showHeader?: boolean;
  headerTitle?: string;
  headerActions?: ReactNode;
  hideZeros?: boolean;
  onHideZerosChange?: (value: boolean) => void;
  statsCustomizationConfig?: StatsCustomizationConfig;
}

type VisibleStatDefinition = BattleStatDefinition & {
  label: string;
};

type VisibleStatCategory = {
  id: string;
  label: string;
  stats: VisibleStatDefinition[];
};

const formatValue = (
  value: unknown,
  formatter?: (value: unknown) => string,
  booleanLabels?: { yes: string; no: string },
): string => {
  if (formatter) {
    return formatter(value);
  }
  if (typeof value === "number") {
    return value.toLocaleString("pl-PL");
  }
  if (typeof value === "boolean") {
    return value
      ? (booleanLabels?.yes ?? "true")
      : (booleanLabels?.no ?? "false");
  }
  return String(value ?? 0);
};

const normalizeStatSearchText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getMatchingStatSearchKey = (
  query: string,
  categories: VisibleStatCategory[],
) => {
  const normalizedQuery = normalizeStatSearchText(query);

  if (!normalizedQuery) {
    return null;
  }

  for (const category of categories) {
    const categoryIndex = normalizeStatSearchText(
      `${category.label} ${category.id}`,
    );

    if (categoryIndex.includes(normalizedQuery)) {
      return `category:${category.id}`;
    }

    for (const stat of category.stats) {
      const statIndex = normalizeStatSearchText(
        `${stat.label} ${String(stat.key)}`,
      );

      if (statIndex.includes(normalizedQuery)) {
        return `stat:${String(stat.key)}`;
      }
    }
  }

  return null;
};

export function OneVsOneStatsTable({
  battle,
  cardClassName,
  compact,
  scrollClassName,
  showHeader = true,
  headerTitle,
  headerActions,
  hideZeros: controlledHideZeros,
  onHideZerosChange,
  statsCustomizationConfig,
}: OneVsOneStatsTableProps) {
  const { t } = useTranslation();
  const [internalHideZeros, setInternalHideZeros] = useState(true);
  const [statSearchQuery, setStatSearchQuery] = useState("");
  const [activeStatSearchKey, setActiveStatSearchKey] = useState<string | null>(
    null,
  );
  const statsScrollViewportRef = useRef<HTMLDivElement>(null);
  const statSearchAnimationFrameRef = useRef<number | null>(null);
  const hideZeros = controlledHideZeros ?? internalHideZeros;
  const setHideZeros = onHideZerosChange ?? setInternalHideZeros;
  const booleanLabels = {
    yes: t("common.boolean.yes"),
    no: t("common.boolean.no"),
  };

  const internalStatsCustomization = useStatsCustomization(STAT_CATEGORIES);
  const {
    config: internalConfig,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
  } = internalStatsCustomization;
  const config = statsCustomizationConfig ?? internalConfig;

  const userWarrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );
  const opponentWarrior = battle.warriors.find(
    (w) => w.originalId !== battle.characterId,
  );

  const user = userWarrior;
  const opponent = opponentWarrior;

  const categoriesMap = new Map<string, BattleStatCategoryDefinition>(
    STAT_CATEGORIES.map((category) => [category.id, category]),
  );
  const allStatsMap = new Map<string, BattleStatDefinition>();
  for (const category of STAT_CATEGORIES) {
    for (const stat of category.stats) {
      allStatsMap.set(String(stat.key), stat);
    }
  }

  const visibleStats = config.categoryOrder
    .map((categoryId) => {
      const customization = config.categories[categoryId];
      const categoryDefinition = categoriesMap.get(categoryId);

      if (!customization?.visible) {
        return null;
      }

      const orderedStats = customization.statOrder
        .map((statKey) => allStatsMap.get(statKey))
        .filter((stat): stat is BattleStatDefinition => stat !== undefined);

      const filteredStats =
        hideZeros && user && opponent
          ? orderedStats.filter((stat) => {
              const userValue = user[stat.key];
              const opponentValue = opponent[stat.key];

              const userNum = typeof userValue === "number" ? userValue : 0;
              const opponentNum =
                typeof opponentValue === "number" ? opponentValue : 0;

              return userNum !== 0 || opponentNum !== 0;
            })
          : orderedStats;

      if (filteredStats.length === 0) {
        return null;
      }

      return {
        id: categoryId,
        label:
          customization.name ??
          (categoryDefinition
            ? t(categoryDefinition.labelKey)
            : customization.id),
        stats: filteredStats.map((stat) => ({
          ...stat,
          label: t(stat.labelKey),
        })),
      };
    })
    .filter(
      (category): category is NonNullable<typeof category> => category !== null,
    );

  const scrollToStatSearchKey = (searchKey: string) => {
    if (statSearchAnimationFrameRef.current != null) {
      cancelAnimationFrame(statSearchAnimationFrameRef.current);
    }

    statSearchAnimationFrameRef.current = requestAnimationFrame(() => {
      statSearchAnimationFrameRef.current = null;

      const matchingRow = Array.from(
        statsScrollViewportRef.current?.querySelectorAll<HTMLElement>(
          "[data-battle-stat-search-key]",
        ) ?? [],
      ).find((row) => row.dataset.battleStatSearchKey === searchKey);

      if (!matchingRow || !statsScrollViewportRef.current) {
        return;
      }

      const viewportRect =
        statsScrollViewportRef.current.getBoundingClientRect();
      const rowRect = matchingRow.getBoundingClientRect();
      const scrollTop =
        statsScrollViewportRef.current.scrollTop +
        rowRect.top -
        viewportRect.top -
        STAT_SEARCH_SCROLL_OFFSET_PX;

      statsScrollViewportRef.current.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });
    });
  };

  useEffect(
    () => () => {
      if (statSearchAnimationFrameRef.current == null) {
        return;
      }

      cancelAnimationFrame(statSearchAnimationFrameRef.current);
    },
    [],
  );

  useEffect(() => {
    const matchingKey = getMatchingStatSearchKey(statSearchQuery, visibleStats);
    setActiveStatSearchKey(matchingKey);

    if (!matchingKey) {
      return;
    }

    scrollToStatSearchKey(matchingKey);
  }, [statSearchQuery, visibleStats]);

  if (!user || !opponent) {
    return (
      <Card className="border-border bg-card  p-8 w-full text-center text-muted-foreground">
        {t("battleUi.oneVsOne.empty")}
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border bg-card  overflow-hidden gap-0 p-0 w-full",
        cardClassName,
      )}
    >
      {showHeader && (
        <BattleStatsTableHeader
          title={headerTitle ?? t("battlePanel.single.statistics.title")}
          compact={compact}
          leading={
            <SearchInput
              aria-label={t("battleUi.customization.searchStat")}
              className={cn(compact ? "h-8 text-sm" : "h-9 text-sm")}
              placeholder={t("battleUi.customization.searchStat")}
              value={statSearchQuery}
              wrapperClassName="w-full"
              onChange={(event) => setStatSearchQuery(event.target.value)}
            />
          }
          actions={
            headerActions ?? (
              <>
                <StatsCustomizationModal
                  config={internalConfig}
                  defaultCategories={STAT_CATEGORIES}
                  onUpdateCategoryOrder={updateCategoryOrder}
                  onToggleCategoryVisibility={toggleCategoryVisibility}
                  onUpdateCategoryName={updateCategoryName}
                  onUpdateStatOrder={updateStatOrder}
                  onAddStatToCategory={addStatToCategory}
                  onRemoveStatFromCategory={removeStatFromCategory}
                  onAddCategory={addCategory}
                  onRemoveCategory={removeCategory}
                  onResetToDefaults={resetToDefaults}
                  compactTrigger={compact}
                />
                {compact ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setHideZeros(!hideZeros)}
                        aria-label={
                          hideZeros
                            ? t("battlePanel.single.statistics.showAll")
                            : t("battlePanel.single.statistics.hideZeros")
                        }
                        className="size-8"
                      >
                        {hideZeros ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {hideZeros
                        ? t("battlePanel.single.statistics.showAll")
                        : t("battlePanel.single.statistics.hideZeros")}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHideZeros(!hideZeros)}
                    className="gap-2"
                  >
                    {hideZeros ? (
                      <>
                        <Eye className="h-4 w-4" />
                        {t("battlePanel.single.statistics.showAll")}
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        {t("battlePanel.single.statistics.hideZeros")}
                      </>
                    )}
                  </Button>
                )}
              </>
            )
          }
        />
      )}
      <ScrollArea
        ref={statsScrollViewportRef}
        className={cn("min-h-0 w-full max-w-screen", scrollClassName)}
      >
        <Table
          className={cn(compact && "text-[13px] leading-[1.35]")}
          style={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: compact ? "360px" : "420px",
          }}
        >
          <colgroup>
            <col style={{ width: compact ? "150px" : "180px" }} />
            <col style={{ width: compact ? "105px" : "120px" }} />
            <col style={{ width: compact ? "105px" : "120px" }} />
          </colgroup>
          <TableHeader className="[&_tr]:border-b [&_tr]:border-border/70">
            <TableRow className="border-b border-border/70">
              <TableHead
                className={cn(
                  "sticky left-0 top-0 z-20 border-r border-b border-border/70 bg-muted/80 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                  compact && "h-7 px-2 text-[13px]",
                )}
              >
                {t("battleUi.oneVsOne.stat")}
              </TableHead>
              <TableHead
                className={cn(
                  "sticky top-0 z-10 border-b border-border/70 text-center whitespace-wrap px-2",
                  BATTLE_SURFACE_COLORS.team.friendlyHeader,
                  compact && "h-7 px-1.5 text-[13px]",
                )}
              >
                {user.name}
              </TableHead>
              <TableHead
                className={cn(
                  "sticky top-0 z-10 border-b border-border/70 text-center whitespace-wrap px-2",
                  BATTLE_SURFACE_COLORS.team.enemyHeader,
                  compact && "h-7 px-1.5 text-[13px]",
                )}
              >
                {opponent.name}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStats.map((category) => [
              <TableRow
                key={`category-${category.id}`}
                className={cn(
                  "border-b border-border/70 bg-muted/50",
                  activeStatSearchKey === `category:${category.id}` &&
                    "outline outline-1 -outline-offset-1 outline-primary/60",
                )}
                data-battle-stat-search-key={`category:${category.id}`}
              >
                <TableCell
                  className={cn(
                    "sticky left-0 z-10 border-r border-border/70 bg-muted/50 font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                    compact ? "px-2 py-1" : "py-1",
                  )}
                >
                  {category.label}
                </TableCell>
                <TableCell
                  className={cn("bg-muted/50", compact && "px-1.5 py-1")}
                />
                <TableCell
                  className={cn("bg-muted/50", compact && "px-1.5 py-1")}
                />
              </TableRow>,
              ...category.stats.map((stat) => {
                const userValue = user[stat.key];
                const opponentValue = opponent[stat.key];
                const statSearchKey = `stat:${String(stat.key)}`;

                return (
                  <TableRow
                    key={`${category.id}-${stat.key}`}
                    className={cn(
                      "border-b border-border/70",
                      activeStatSearchKey === statSearchKey &&
                        "outline outline-1 -outline-offset-1 outline-primary/60",
                    )}
                    data-battle-stat-search-key={statSearchKey}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-10 border-r border-border/70 bg-background font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] hover:bg-background",
                        compact ? "px-2 py-1 leading-[1.35]" : "py-2",
                        stat.color,
                      )}
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                      }}
                    >
                      {stat.label}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center tabular-nums whitespace-nowrap",
                        BATTLE_SURFACE_COLORS.team.friendlyCell,
                        compact ? "px-1.5 py-1" : "px-2 py-2",
                      )}
                    >
                      {formatValue(userValue, stat.format, booleanLabels)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center tabular-nums whitespace-nowrap",
                        BATTLE_SURFACE_COLORS.team.enemyCell,
                        compact ? "px-1.5 py-1" : "px-2 py-2",
                      )}
                    >
                      {formatValue(opponentValue, stat.format, booleanLabels)}
                    </TableCell>
                  </TableRow>
                );
              }),
            ])}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
