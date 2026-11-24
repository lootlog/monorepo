import { formatLevel } from "@lootlog/domain/profession";
import type { BattleWarrior as Warrior } from "../lib/battle-types";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleHeaderProps = {
  warriors: Warrior[];
  characterId?: string;
};

export const BattleHeader: FC<BattleHeaderProps> = ({
  warriors,
  characterId,
}) => {
  const { t } = useTranslation();
  const attackingTeam = warriors.filter((w) => w.team === 1);
  const defendingTeam = warriors.filter((w) => w.team === 2);

  return (
    <>
      <li className="border-b-2 border-solid border-background bg-muted/50 px-3 py-1.5 text-muted-foreground">
        {t("battleUi.header.startedBetween")}{" "}
        {attackingTeam.map((w) => {
          const isLast = w === attackingTeam[attackingTeam.length - 1];

          return (
            <span
              key={w.originalId}
              className={cn({ "font-bold": w.originalId === characterId })}
            >
              {w.name} ({formatLevel(w.lvl, w.prof)}){!isLast && ", "}
            </span>
          );
        })}{" "}
        {t("battleUi.header.and")}{" "}
        {defendingTeam.map((w) => {
          const isLast = w === defendingTeam[defendingTeam.length - 1];

          return (
            <span
              key={w.originalId}
              className={cn({ "font-bold": w.originalId === characterId })}
            >
              {w.name} ({formatLevel(w.lvl, w.prof)}){!isLast && ", "}
            </span>
          );
        })}
      </li>
    </>
  );
};
