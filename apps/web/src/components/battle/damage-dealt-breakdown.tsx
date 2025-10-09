import { Warrior } from "@/hooks/api/battle-log/use-battles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { FC } from "react";

interface DamageDealtBreakdownProps {
  warrior: Warrior;
}

export const DamageDealtBreakdown: FC<DamageDealtBreakdownProps> = ({
  warrior,
}) => {
  const damageStats = [
    {
      type: "Wszystkie zadane obrażenia",
      value: warrior.damageDealt,
      color: "text-white",
    },
    {
      type: "Obrażenia dystansowe",
      value: warrior.distanceDamage,
      color: "text-green-400",
    },
    {
      type: "Obrażenia fizyczne",
      value: warrior.meleeDamage,
      color: "text-blue-300",
    },
    {
      type: "Obrażenia pomocnicze",
      value: warrior.auxiliaryDamage,
      color: "text-orange-300",
    },
    {
      type: "Obrażenia od ognia",
      value: warrior.fireDamage,
      color: "text-red-400",
    },
    {
      type: "Obrażenia od zimna",
      value: warrior.frostDamage,
      color: "text-cyan-400",
    },
    {
      type: "Obrażenia od błyskawic",
      value: warrior.lightningDamage,
      color: "text-yellow-400",
    },
    {
      type: "Obrażenia od trzeciego ciosu",
      value: warrior.thirdAttDamage,
      color: "text-orange-400",
    },
    {
      type: "Obrażenia od wściekłości",
      value: warrior.rageDamageDealt,
      color: "text-red-300",
    },
    {
      type: "Zadane obrażenia procentowe",
      value: warrior.trueDamageDealt,
      color: "text-white",
    },
    {
      type: "Zadane obrażenia od piętna bestii",
      value: warrior.stigmaDamageDealt,
      color: "text-purple-400",
    },
    {
      type: "Odbite obrażenia",
      value: warrior.reflectedDamage,
      color: "text-purple-400",
    },
  ].filter((item) => item.value > 0);

  if (damageStats.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        Brak szczegółowych informacji o zadanych obrażeniach
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        Szczegółowy podział zadanych obrażeń - {warrior.name} - (nie bierze pod
        uwagę pasywnych obrażeń np. od trucizny lub gr)
      </h4>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-xs">Typ obrażeń</TableHead>
            <TableHead className="h-8 text-xs text-right">Wartość</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {damageStats.map((item, index) => (
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
  );
};
