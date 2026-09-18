import { BattleCompactTeamMember } from "@/components/battle/battle-compact-team-member";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { cn } from "cn";
import { Shield, Sword } from "lucide-react";
import type { FC, ReactNode } from "react";

export type BattleCompactTeamProps = {
  align?: "start" | "end";
  cdnBaseUrl: string;
  characterId: string;
  isUserTeam: boolean;
  label: string;
  opposingTeam: Warrior[];
  result?: ReactNode;
  team: Warrior[];
};

export const BattleCompactTeam: FC<BattleCompactTeamProps> = ({
  align = "start",
  cdnBaseUrl,
  characterId,
  isUserTeam,
  label,
  opposingTeam,
  result,
  team,
}) => {
  const isDuel = team.length === 1 && opposingTeam.length === 1;
  const isGroup = team.length > 1;
  const TeamIcon = isUserTeam ? Shield : Sword;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
          align === "end" && "@md:flex-row-reverse",
        )}
      >
        <h2
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase leading-none tracking-wide",
            isUserTeam
              ? BATTLE_TEXT_COLORS.team.friendly
              : BATTLE_TEXT_COLORS.team.enemy,
          )}
        >
          <TeamIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
          {isGroup && (
            <span className="rounded-sm bg-background/60 px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {team.length}
            </span>
          )}
        </h2>
        {result}
      </div>

      <ul
        className={cn(
          isGroup
            ? "flex flex-wrap gap-1 @2xl:grid @2xl:gap-1.5 @2xl:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]"
            : "flex",
          !isGroup && align === "end" && "@md:justify-end",
        )}
      >
        {team.map((member) => (
          <BattleCompactTeamMember
            key={member.id}
            cdnBaseUrl={cdnBaseUrl}
            compact={isGroup}
            isCurrentCharacter={member.originalId === characterId}
            member={member}
            opposingTeam={isDuel ? opposingTeam : []}
          />
        ))}
      </ul>
    </section>
  );
};
