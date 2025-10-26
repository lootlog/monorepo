import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { FC } from "react";

interface WarriorDetailsBreakdownProps {
  warrior: Warrior;
}

export const WarriorDetailsBreakdown: FC<WarriorDetailsBreakdownProps> = ({
  warrior,
}) => {
  const healingStats = [
    {
      type: "Pasywne leczenie",
      value: warrior.passiveHealing,
      color: "text-green-400",
    },
    {
      type: "Aktywne leczenie",
      value: warrior.activeHealing,
      color: "text-green-400",
    },
  ].filter((item) => item.value > 0);

  const offensiveStats = [
    {
      type: "Przebicia pancerza",
      value: warrior.armorPierces,
      color: "text-yellow-400",
    },
    {
      type: "Szybkie strzały",
      value: warrior.fastArrows,
      color: "text-yellow-400",
    },
    {
      type: "Zniszczony pancerz",
      value: warrior.reducedArmor,
      color: "text-yellow-400",
    },
    {
      type: "Zniszczone odporności",
      value: warrior.magicResistanceDestroyed,
      color: "text-yellow-400",
    },
    {
      type: "Zredukowana odporność na trucizny",
      value: warrior.reducedPoisonResistance,
      color: "text-yellow-400",
    },
  ].filter((item) => item.value > 0);

  const defensiveStats = [
    {
      type: "Kontry",
      value: warrior.counters,
      color: "text-blue-400",
    },
  ].filter((item) => item.value > 0);

  const resourceStats = [
    {
      type: "Zniszczona energia",
      value: warrior.destroyedEnergy,
      color: "text-cyan-400",
    },
    {
      type: "Zniszczona mana",
      value: warrior.destroyedMana,
      color: "text-blue-400",
    },
    {
      type: "Zregenerowana energia",
      value: warrior.regeneratedEnergy,
      color: "text-cyan-400",
    },
  ].filter((item) => item.value > 0);

  const sections = [
    { title: "Leczenie", stats: healingStats },
    { title: "Efekty ofensywne", stats: offensiveStats },
    { title: "Efekty defensywne", stats: defensiveStats },
    { title: "Zasoby", stats: resourceStats },
  ].filter((section) => section.stats.length > 0);

  if (sections.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        Brak dodatkowych statystyk dla tego wojownika
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        Szczegółowe statystyki - {warrior.name}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h5 className="font-medium text-xs mb-2 text-muted-foreground">
              {section.title}
            </h5>
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">Typ</TableHead>
                  <TableHead className="h-8 text-xs text-right">
                    Wartość
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.stats.map((item, index) => (
                  <TableRow key={index} className="h-8 hover:bg-transparent">
                    <TableCell className={`py-1 ${item.color}`}>
                      {item.type}
                    </TableCell>
                    <TableCell className="py-1 text-right font-medium tabular-nums">
                      {item.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
};
