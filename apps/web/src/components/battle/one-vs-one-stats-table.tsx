import { useBattleStatsSearchScroll } from "./use-battle-stats-search-scroll";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Table } from "@lootlog/ui/components/table";
import { useTable } from "@tanstack/react-table";
import type { Battle } from "@/lib/api/battlelog-types";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { BattleStatsCustomizationActions } from "./battle-stats-customization-actions";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useBattleStatsPinnedHeader } from "./use-battle-stats-pinned-header";
import { useTranslation } from "react-i18next";
import type { StatsCustomizationConfig } from "@/types/stats-customization.types";
import { cn } from "cn";
import { SearchInput } from "@/components/ui/search-input";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import {
  getOneVsOneStatsColumns,
  getOneVsOneStatsHeadClassName,
} from "./one-vs-one-stats-columns";
import { STAT_CATEGORIES } from "./one-vs-one-stats-definitions";
import {
  getMatchingStatSearchKey,
  getOneVsOneStatsRows,
  getVisibleStats,
} from "./one-vs-one-stats-rows";
import { OneVsOneStatsTableBody } from "./one-vs-one-stats-table-body";

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
  /** Pins the title, search and column header to the scroller the table lives in. */
  pinnedHeader?: boolean;
  statsCustomizationConfig?: StatsCustomizationConfig;
}

const resolveStatsTableConfiguration = ({
  controlledHideZeros,
  internalConfig,
  internalHideZeros,
  internalSetHideZeros,
  onHideZerosChange,
  showHeader,
  statsCustomizationConfig,
}: {
  controlledHideZeros?: boolean;
  internalConfig: ReturnType<typeof useStatsCustomization>["config"];
  internalHideZeros: boolean;
  internalSetHideZeros: (hideZeros: boolean) => void;
  onHideZerosChange?: (hideZeros: boolean) => void;
  showHeader?: boolean;
  statsCustomizationConfig?: ReturnType<typeof useStatsCustomization>["config"];
}) => ({
  config: statsCustomizationConfig ?? internalConfig,
  hideZeros: controlledHideZeros ?? internalHideZeros,
  setHideZeros: onHideZerosChange ?? internalSetHideZeros,
  showHeader: showHeader ?? true,
});

const getColumnHeaderTopClassName = (pinnedHeader: boolean) =>
  pinnedHeader
    ? "top-[calc(var(--battle-detail-pin-top,0px)+var(--battle-stats-pinned-height,0px))]"
    : "top-0";

export function OneVsOneStatsTable({
  battle,
  cardClassName,
  compact,
  scrollClassName,
  showHeader,
  headerTitle,
  headerActions,
  hideZeros: controlledHideZeros,
  onHideZerosChange,
  pinnedHeader = false,
  statsCustomizationConfig,
}: OneVsOneStatsTableProps) {
  const { t } = useTranslation();
  const [internalHideZeros, setInternalHideZeros] = useState(true);
  const [statSearchQuery, setStatSearchQuery] = useState("");
  const statsScrollViewportRef = useRef<HTMLDivElement>(null);
  const { cardRef, pinnedHeaderRef } = useBattleStatsPinnedHeader(pinnedHeader);

  const booleanLabels = {
    yes: t("common.boolean.yes"),
    no: t("common.boolean.no"),
  };

  const internalStatsCustomization = useStatsCustomization(STAT_CATEGORIES);
  const { config: internalConfig } = internalStatsCustomization;

  const {
    config,
    hideZeros,
    setHideZeros,
    showHeader: resolvedShowHeader,
  } = resolveStatsTableConfiguration({
    controlledHideZeros,
    internalConfig,
    internalHideZeros,
    internalSetHideZeros: setInternalHideZeros,
    onHideZerosChange,
    showHeader,
    statsCustomizationConfig,
  });

  const userWarrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );

  const opponentWarrior = battle.warriors.find(
    (w) => w.originalId !== battle.characterId,
  );

  const user = userWarrior;
  const opponent = opponentWarrior;

  useEffect(() => {
    const viewport = statsScrollViewportRef.current;
    const header = viewport?.querySelector("thead");

    if (!viewport || !header) return;

    const updateHeaderHeight = () => {
      viewport.style.setProperty(
        "--scroll-fade-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    return () => {
      observer.disconnect();
      viewport.style.removeProperty("--scroll-fade-header-height");
    };
  }, [user, opponent, compact]);

  const visibleStats = getVisibleStats({
    config,
    hideZeros,
    opponent,
    t,
    user,
  });

  const activeStatSearchKey = getMatchingStatSearchKey(
    statSearchQuery,
    visibleStats,
  );

  useBattleStatsSearchScroll({
    viewportRef: statsScrollViewportRef,
    searchKey: activeStatSearchKey,
    searchQuery: statSearchQuery,
    categories: visibleStats,
  });

  const columns = getOneVsOneStatsColumns({
    booleanLabels,
    compact,
    opponent,
    statHeader: t("battleUi.oneVsOne.stat"),
    user,
  });

  const table = useTable({
    features: coreTableFeatures,
    data: getOneVsOneStatsRows(visibleStats),
    columns,
    getRowId: (row) => row.id,
  });

  // A pinned header sticks to the page's scroller, so the table cannot sit in one of its own.
  const StatsScroller = pinnedHeader ? "div" : ScrollArea;
  const columnHeaderTopClassName = getColumnHeaderTopClassName(pinnedHeader);

  if (!user || !opponent) {
    return (
      <Card className="border-border bg-card  p-8 w-full text-center text-muted-foreground">
        {t("battleUi.oneVsOne.empty")}
      </Card>
    );
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        // `isolate` keeps the sticky cells' z-indexes from competing with the pinned chart.
        "isolate border-border bg-card gap-0 p-0 w-full",
        // `overflow-clip` rounds the corners without becoming a scroll container, so the
        // header can stick to the scroller the table lives in.
        pinnedHeader ? "overflow-clip" : "overflow-hidden",
        cardClassName,
      )}
    >
      {resolvedShowHeader && (
        <BattleStatsTableHeader
          ref={pinnedHeaderRef}
          className={cn(
            pinnedHeader &&
              "sticky top-(--battle-detail-pin-top,0px) z-30 bg-card",
          )}
          title={headerTitle ?? t("battlePanel.single.statistics.title")}
          compact={compact}
          leading=<SearchInput
            aria-label={t("battleUi.customization.searchStat")}
            className={cn(compact ? "h-8 text-sm" : "h-9 text-sm")}
            placeholder={t("battleUi.customization.searchStat")}
            value={statSearchQuery}
            wrapperClassName="w-full"
            onChange={(event) => setStatSearchQuery(event.target.value)}
          />
          actions={
            headerActions ?? (
              <BattleStatsCustomizationActions
                customization={internalStatsCustomization}
                compact={compact}
                hideZeros={hideZeros}
                setHideZeros={setHideZeros}
              />
            )
          }
        />
      )}
      <StatsScroller
        ref={statsScrollViewportRef}
        className={cn(
          "min-h-0 w-full max-w-screen",
          !pinnedHeader && "scroll-area-sticky-table",
          scrollClassName,
        )}
      >
        <Table
          className={cn(compact && "leading-[1.35]")}
          style={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: compact ? "316px" : "420px",
          }}
        >
          <colgroup>
            <col style={{ width: compact ? "128px" : "180px" }} />
            <col style={{ width: compact ? "94px" : "120px" }} />
            <col style={{ width: compact ? "94px" : "120px" }} />
          </colgroup>
          <TanStackTableHeader
            table={table}
            className="[&_tr]:border-b [&_tr]:border-border/70"
            rowClassName="border-b border-border/70"
            getHeadClassName={(header) =>
              getOneVsOneStatsHeadClassName({
                columnId: header.column.id,
                compact,
                topClassName: columnHeaderTopClassName,
              })
            }
          />
          <OneVsOneStatsTableBody
            table={table}
            activeSearchKey={activeStatSearchKey}
          />
        </Table>
      </StatsScroller>
    </Card>
  );
}
