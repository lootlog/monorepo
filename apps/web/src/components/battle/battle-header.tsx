import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";

export type BattleHeaderProps = {
  warriors: Warrior[];
  characterId?: string;
};

export const BattleHeader: FC<BattleHeaderProps> = ({
  warriors,
  characterId,
}) => {
  const attackingTeam = warriors.filter((w) => w.team === 1);
  const defendingTeam = warriors.filter((w) => w.team === 2);

  return (
    <>
      <li className="border-b-2 border-solid border-background bg-gray-500/10 px-3 py-0.5">
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
    </>
  );
};
