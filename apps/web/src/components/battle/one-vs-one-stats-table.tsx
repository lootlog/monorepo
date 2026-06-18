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
import type {
  Battle,
  BattleWarrior as Warrior,
} from "@/lib/api/battlelog-types";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { StatsCustomizationModal } from "./stats-customization/stats-customization-modal";
import { BattleStatsTableHeader } from "./battle-stats-table-header";
import { useTranslation } from "react-i18next";
import type { StatsCustomizationConfig } from "@/types/stats-customization.types";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { SearchInput } from "@/components/ui/search-input";

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

interface StatDefinition {
  key: keyof Warrior;
  label: string;
  color?: string;
  format?: (value: unknown) => string;
}

interface StatCategory {
  name: string;
  stats: StatDefinition[];
}

type VisibleStatCategory = {
  id: string;
  name: string;
  stats: StatDefinition[];
};

export const STAT_CATEGORIES: StatCategory[] = [
  {
    name: "Statystyki tur",
    stats: [
      { key: "turns", label: "Tury", color: "text-blue-400" },
      { key: "steps", label: "Kroki", color: "text-green-400" },
      { key: "turnsLost", label: "Utracone tury", color: "text-red-400" },
      { key: "normalAttacks", label: "Zwykłe ataki", color: "text-orange-400" },
      {
        key: "spellsUsed",
        label: "Użyte umiejętności",
        color: "text-purple-400",
      },
    ],
  },
  {
    name: "Zadane obrażenia",
    stats: [
      { key: "damageDealt", label: "Obrażenia", color: "text-white" },
      {
        key: "distanceDamage",
        label: "Obrażenia dystansowe",
        color: "text-green-400",
      },
      {
        key: "meleeDamage",
        label: "Obrażenia w zwarciu",
        color: "text-blue-300",
      },
      {
        key: "auxiliaryDamage",
        label: "Obrażenia pomocnicze",
        color: "text-orange-300",
      },
      { key: "fireDamage", label: "Obrażenia od ognia", color: "text-red-400" },
      {
        key: "frostDamage",
        label: "Obrażenia od zimna",
        color: "text-cyan-400",
      },
      {
        key: "lightningDamage",
        label: "Obrażenia od błyskawic",
        color: "text-yellow-400",
      },
      {
        key: "thirdAttDamage",
        label: "Obrażenia trzeciego ciosu",
        color: "text-orange-400",
      },
      {
        key: "rageDamageDealt",
        label: "Obrażenia od wściekłości",
        color: "text-red-300",
      },
      { key: "trueDamageDealt", label: "True damage", color: "text-white" },
      {
        key: "stigmaDamageDealt",
        label: "Obrażenia od piętna bestii",
        color: "text-purple-400",
      },
      {
        key: "reflectedDamage",
        label: "Odbite obrażenia",
        color: "text-purple-400",
      },
      {
        key: "damageDealtAfterDefensive",
        label: "Trafione obrażenia (ataki)",
      },
      {
        key: "damageDealtAfterDefensivePercentage",
        label: "Skuteczność",
        format: (v) => `${v}%`,
      },
    ],
  },
  {
    name: "Otrzymane obrażenia",
    stats: [
      { key: "damageTaken", label: "Otrzymane obrażenia", color: "text-white" },
      {
        key: "distanceDamageTaken",
        label: "Obrażenia dystansowe",
        color: "text-green-400",
      },
      {
        key: "meleeDamageTaken",
        label: "Obrażenia w zwarciu",
        color: "text-blue-300",
      },
      {
        key: "auxiliaryDamageTaken",
        label: "Obrażenia pomocnicze",
        color: "text-orange-300",
      },
      {
        key: "fireDamageTaken",
        label: "Obrażenia od ognia",
        color: "text-red-400",
      },
      {
        key: "frostDamageTaken",
        label: "Obrażenia od zimna",
        color: "text-cyan-400",
      },
      {
        key: "lightningDamageTaken",
        label: "Obrażenia od błyskawic",
        color: "text-yellow-400",
      },
      {
        key: "thirdAttDamageTaken",
        label: "Obrażenia trzeciego ciosu",
        color: "text-orange-400",
      },
      { key: "flatDamageTaken", label: "Obrażenia od ataków" },
      { key: "trueDamageTaken", label: "True damage", color: "text-white" },
      {
        key: "stigmaDamageTaken",
        label: "Obrażenia od piętna bestii",
        color: "text-purple-400",
      },
      {
        key: "woundDamageTaken",
        label: "Obrażenia od głębokich ran",
        color: "text-orange-600",
      },
      {
        key: "poisonDamageTaken",
        label: "Obrażenia od trucizny",
        color: "text-green-600",
      },
      {
        key: "injureDamageTaken",
        label: "Obrażenia od zranienia",
        color: "text-red-300",
      },
      {
        key: "critWoundDamageTaken",
        label: "Obrażenia od zranienia",
        color: "text-orange-400",
      },
      {
        key: "firePassiveDamageTaken",
        label: "Pasywne obrażenia od ognia",
        color: "text-red-500",
      },
      {
        key: "lightningPassiveDamageTaken",
        label: "Pasywne obrażenia od błyskawic",
        color: "text-yellow-500",
      },
      {
        key: "legbonAnguishDamageTaken",
        label: "Udręka (otrzymane obrażenia)",
        color: "text-red-600",
      },
      { key: "reflectedDamageTaken", label: "Otrzymane odbite obrażenia" },
    ],
  },
  {
    name: "Tury",
    stats: [
      { key: "criticalHits", label: "Krytyki" },
      {
        key: "armorPierces",
        label: "Przebicia pancerza",
        color: "text-yellow-400",
      },
      { key: "injures", label: "Zranienia" },

      { key: "fastArrows", label: "Szybkie strzały", color: "text-yellow-400" },
    ],
  },
  {
    name: "Bonusy legendarne",
    stats: [
      { key: "legbons", label: "Bonusy" },
      { key: "legbonCurse", label: "Klątwa", color: "text-yellow-400" },
      { key: "legbonCleanse", label: "Oczyszczenie", color: "text-blue-400" },
      {
        key: "legbonLastheal",
        label: "Ostatni ratunek",
        color: "text-green-400",
      },
      {
        key: "legbonLasthealValue",
        label: "Ostatni ratunek (wartość leczenia)",
        color: "text-gray-400",
      },
      { key: "legbonGlare", label: "Oślepienie", color: "text-yellow-400" },
      {
        key: "legbonHolytouch",
        label: "Dotyk anioła (ilość)",
        color: "text-blue-300",
      },
      {
        key: "legbonHolytouchValue",
        label: "Dotyk anioła (wartość leczenia)",
        color: "text-blue-300",
      },
      {
        key: "legbonCritredValue",
        label: "Krytyczna osłona (wartość)",
        color: "text-sky-400",
      },
      {
        key: "legbonFacadeValue",
        label: "Fasada opieki (wartość)",
        color: "text-sky-400",
      },
      {
        key: "legbonVerycrit",
        label: "Cios bardzo krytyczny",
        color: "text-red-600",
      },
      {
        key: "legbonAnguish",
        label: "Krwawa udręka (liczba)",
        color: "text-red-600",
      },
      {
        key: "legbonPunctureValue",
        label: "Przeszywająca skuteczność (wartość)",
        color: "text-red-300",
      },
    ],
  },
  {
    name: "Niszczenie defensywy",
    stats: [
      {
        key: "reducedArmor",
        label: "Zniszczony pancerz",
        color: "text-yellow-400",
      },
      {
        key: "magicResistanceDestroyed",
        label: "Zniszczona odporność magiczna",
        color: "text-yellow-400",
      },
      {
        key: "reducedPoisonResistance",
        label: "Zniszczona odporność na truciznę",
        color: "text-yellow-400",
      },
    ],
  },
  {
    name: "Defensywa",
    stats: [
      { key: "evasions", label: "Uniki" },
      { key: "counters", label: "Kontry", color: "text-blue-400" },
      { key: "blocks", label: "Bloki", color: "text-blue-400" },
      {
        key: "blockedDamage",
        label: "Zablokowane obrażenia",
        color: "text-green-400",
      },
    ],
  },
  {
    name: "Leczenie",
    stats: [
      {
        key: "passiveHealing",
        label: "Pasywne leczenie",
        color: "text-green-400",
      },
      {
        key: "activeHealing",
        label: "Aktywne leczenie",
        color: "text-green-400",
      },
    ],
  },
  {
    name: "Zasoby",
    stats: [
      {
        key: "destroyedEnergy",
        label: "Zniszczona energia",
        color: "text-cyan-400",
      },
      {
        key: "destroyedMana",
        label: "Zniszczona mana",
        color: "text-blue-400",
      },
      {
        key: "regeneratedEnergy",
        label: "Zregenerowana energia",
        color: "text-cyan-400",
      },
    ],
  },
];

const formatValue = (
  value: unknown,
  formatter?: (value: unknown) => string,
): string => {
  if (formatter) {
    return formatter(value);
  }
  if (typeof value === "number") {
    return value.toLocaleString("pl-PL");
  }
  if (typeof value === "boolean") {
    return value ? "Tak" : "Nie";
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
      `${category.name} ${category.id}`,
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

  const allStatsMap = new Map<string, StatDefinition>();
  for (const category of STAT_CATEGORIES) {
    for (const stat of category.stats) {
      allStatsMap.set(stat.key, stat);
    }
  }

  const visibleStats = config.categoryOrder
    .map((categoryId) => {
      const customization = config.categories[categoryId];

      if (!customization?.visible) {
        return null;
      }

      const orderedStats = customization.statOrder
        .map((statKey) => allStatsMap.get(statKey))
        .filter((stat): stat is StatDefinition => stat !== undefined);

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
        name: customization.name,
        stats: filteredStats,
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
      <Card className="border-border bg-card/40 backdrop-blur-sm p-8 w-full text-center text-muted-foreground">
        Nie znaleziono danych walki 1v1
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0 w-full",
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
              className="h-9 text-sm"
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
          className={cn(compact && "text-sm")}
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
          <TableHeader>
            <TableRow>
              <TableHead
                className={cn(
                  "sticky left-0 top-0 z-20 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                  compact && "h-8 px-2 text-sm",
                )}
              >
                Statystyka
              </TableHead>
              <TableHead
                className={cn(
                  "sticky top-0 z-10 text-center whitespace-wrap px-2 bg-green-950 text-green-50",
                  compact && "h-8 px-1.5 text-sm",
                )}
              >
                {user.name}
              </TableHead>
              <TableHead
                className={cn(
                  "sticky top-0 z-10 text-center whitespace-wrap px-2 bg-red-950 text-red-50",
                  compact && "h-8 px-1.5 text-sm",
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
                  "bg-muted/50",
                  activeStatSearchKey === `category:${category.id}` &&
                    "outline outline-1 -outline-offset-1 outline-primary/60",
                )}
                data-battle-stat-search-key={`category:${category.id}`}
              >
                <TableCell
                  className={cn(
                    "sticky left-0 z-10 font-semibold bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] border-r",
                    compact ? "px-2 py-1" : "py-1",
                  )}
                >
                  {category.name}
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
                      activeStatSearchKey === statSearchKey &&
                        "outline outline-1 -outline-offset-1 outline-primary/60",
                    )}
                    data-battle-stat-search-key={statSearchKey}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-10 hover:bg-background/50 bg-background border-r font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                        compact ? "px-2 py-1 leading-snug" : "py-2",
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
                        "text-center tabular-nums bg-green-400/10 whitespace-nowrap",
                        compact ? "px-1.5 py-1" : "px-2 py-2",
                      )}
                    >
                      {formatValue(userValue, stat.format)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center tabular-nums bg-red-400/10 whitespace-nowrap",
                        compact ? "px-1.5 py-1" : "px-2 py-2",
                      )}
                    >
                      {formatValue(opponentValue, stat.format)}
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
