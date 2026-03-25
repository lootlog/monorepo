import { useState } from "react";
import { ChartArea, EyeOff, Eye } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { Battle, Warrior } from "@/hooks/api/battle-log/use-battles";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { StatsCustomizationModal } from "./stats-customization";

interface OneVsOneStatsTableProps {
  battle: Battle;
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

const STAT_CATEGORIES: StatCategory[] = [
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

export function OneVsOneStatsTable({ battle }: OneVsOneStatsTableProps) {
  const [hideZeros, setHideZeros] = useState(true);

  const {
    config,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
  } = useStatsCustomization(STAT_CATEGORIES);

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

  if (!user || !opponent) {
    return (
      <Card className="border-border bg-card/40 backdrop-blur-sm p-8 w-full text-center text-muted-foreground">
        Nie znaleziono danych walki 1v1
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0 w-full">
      <div className="sticky top-0 z-20 bg-background border-b w-full">
        <div className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <ChartArea className="h-5 w-5" />
              Statystyki walki 1v1
            </div>
            <div className="flex items-center gap-2">
              <StatsCustomizationModal
                config={config}
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
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHideZeros(!hideZeros)}
                className="gap-2"
              >
                {hideZeros ? (
                  <>
                    <Eye className="h-4 w-4" />
                    Pokaż wszystkie
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Ukryj zerowe wartości
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto max-w-screen">
        <Table
          style={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: "420px",
          }}
        >
          <colgroup>
            <col style={{ width: "180px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                Statystyka
              </TableHead>
              <TableHead className="text-center whitespace-wrap px-2 bg-green-400/10">
                {user.name}
              </TableHead>
              <TableHead className="text-center whitespace-wrap px-2 bg-red-400/10">
                {opponent.name}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStats.map((category) => [
              <TableRow key={`category-${category.id}`} className="bg-muted/50">
                <TableCell className="sticky left-0 z-10 font-semibold bg-muted/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] border-r">
                  {category.name}
                </TableCell>
                <TableCell className="bg-muted/50" />
                <TableCell className="bg-muted/50" />
              </TableRow>,
              ...category.stats.map((stat) => {
                const userValue = user[stat.key];
                const opponentValue = opponent[stat.key];

                return (
                  <TableRow key={`${category.id}-${stat.key}`}>
                    <TableCell
                      className={`sticky left-0 z-10 hover:bg-background/50 bg-background border-r font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] py-2 ${stat.color || ""}`}
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                      }}
                    >
                      {stat.label}
                    </TableCell>
                    <TableCell className="text-center tabular-nums bg-green-400/10 whitespace-nowrap px-2 py-2">
                      {formatValue(userValue, stat.format)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums bg-red-400/10 whitespace-nowrap px-2 py-2">
                      {formatValue(opponentValue, stat.format)}
                    </TableCell>
                  </TableRow>
                );
              }),
            ])}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
