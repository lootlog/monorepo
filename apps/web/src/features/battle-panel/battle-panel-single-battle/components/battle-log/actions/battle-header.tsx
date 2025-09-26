import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "@lootlog/ui/lib/utils";
import { FC, memo } from "react";

export type BattleHeaderProps = {
  warriors: Warrior[];
  characterId?: string;
};

export const BattleHeader: FC<BattleHeaderProps> = memo(({ warriors, characterId }) => {
  const attackingTeam = warriors.filter((w) => w.team === 1);
  const defendingTeam = warriors.filter((w) => w.team === 2);

  return (
    <>
      <li className="bg-gray-100/20 px-4 py-1">
        Rozpoczęła się walka pomiędzy{" "}
        {attackingTeam.map((w) => {
          const isLast = w === attackingTeam[attackingTeam.length - 1];

          return (
            <span
              key={w.originalId}
              className={cn({ "font-bold": w.originalId === characterId })}
            >
              {w.name} ({w.lvl}
              {w.prof}){!isLast && ", "}
            </span>
          );
        })}{" "}
        a{" "}
        {defendingTeam.map((w) => {
          const isLast = w === defendingTeam[defendingTeam.length - 1];

          return (
            <span
              key={w.originalId}
              className={cn({ "font-bold": w.originalId === characterId })}
            >
              {w.name} ({w.lvl}
              {w.prof}){!isLast && ", "}
            </span>
          );
        })}
      </li>
      <Separator />
    </>
  );
});

BattleHeader.displayName = "BattleHeader";