import { PlayerTile } from "@/components/battle/player-tile";
import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "@/components/battle/utils/battle-color-palette";
import { BattleDamageTags } from "@/features/user/battle-panel/components/battle-damage-tags";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { cn } from "@lootlog/ui/lib/utils";
import { Sword } from "lucide-react";
import type { FC } from "react";

export type BattleCompactTeamProps = {
  align?: "start" | "end";
  cdnBaseUrl: string;
  characterId: string;
  isUserTeam: boolean;
  label: string;
  opposingTeam: Warrior[];
  team: Warrior[];
};

export const BattleCompactTeam: FC<BattleCompactTeamProps> = ({
  align = "start",
  cdnBaseUrl,
  characterId,
  isUserTeam,
  label,
  opposingTeam,
  team,
}) => {
  return (
    <section
      className={cn(
        "min-w-0 rounded-sm bg-background/35 px-2.5 py-2",
        isUserTeam
          ? BATTLE_SURFACE_COLORS.team.friendlyShadow
          : BATTLE_SURFACE_COLORS.team.enemyShadow,
      )}
    >
      <div
        className={cn(
          "mb-1.5 flex items-center gap-2",
          align === "end" && "lg:justify-end",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-none",
            isUserTeam
              ? BATTLE_TEXT_COLORS.team.friendly
              : BATTLE_TEXT_COLORS.team.enemy,
          )}
        >
          <Sword className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          align === "end" && "lg:justify-end",
        )}
      >
        {team.map((member) => {
          const isCurrentCharacter = member.originalId === characterId;
          const attributableOpposingTeam =
            team.length === 1 && opposingTeam.length === 1 ? opposingTeam : [];

          return (
            <div
              key={member.id}
              className={cn(
                "flex min-w-0 max-w-full items-center gap-1.5 rounded-sm border bg-muted/35 py-1 pl-1 pr-2",
                isCurrentCharacter
                  ? BATTLE_SURFACE_COLORS.team.currentCharacterStrongBorder
                  : "border-border/70",
              )}
            >
              <div className="relative h-9 w-6 shrink-0 overflow-visible">
                <PlayerTile
                  player={member}
                  className="absolute left-0 top-0 origin-top-left scale-75"
                  cdnBaseUrl={cdnBaseUrl}
                />
              </div>
              <div className="min-w-0 text-[11px] leading-tight">
                <div
                  className={cn(
                    "truncate font-semibold",
                    isCurrentCharacter && BATTLE_TEXT_COLORS.team.friendly,
                  )}
                >
                  {member.name}
                </div>
                <div className="flex min-w-0 items-center gap-1 text-muted-foreground">
                  <span>
                    {member.lvl}
                    {member.prof}
                  </span>
                  <BattleDamageTags
                    team={[member]}
                    opposingTeam={attributableOpposingTeam}
                    className="flex-wrap"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
