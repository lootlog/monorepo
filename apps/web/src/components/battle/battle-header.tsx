import { SharedWarrior } from "./types/battle";
import { cn } from "@lootlog/ui/lib/utils";
import { FC, memo } from "react";

export type BattleHeaderProps = {
  warriors: SharedWarrior[];
  characterId?: string;
};

export const BattleHeader: FC<BattleHeaderProps> = memo(
  ({ warriors, characterId }) => {
    const attackingTeam = warriors.filter((w) => w.team === 1);
    const defendingTeam = warriors.filter((w) => w.team === 2);

    return (
      <>
        <li className="bg-gray-500/10 px-4 py-1 border-b-2 border-background border-solid">
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
  }
);

BattleHeader.displayName = "BattleHeader";
