import { BattleCompactTeamMember } from "@/components/battle/battle-compact-team-member";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { cn } from "cn";
import { Shield, Sword } from "lucide-react";
import { useId, type FC, type ReactNode } from "react";

export type BattleCompactTeamProps = {
  align?: "start" | "end";
  cdnBaseUrl: string;
  characterId: string;
  isUserTeam: boolean;
  label: string;
  opposingTeam: Warrior[];
  result?: ReactNode;
  team: Warrior[];
  className?: string;
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
  className,
}) => {
  const headingId = useId();
  const isDuel = team.length === 1 && opposingTeam.length === 1;
  const isGroup = team.length > 1;
  const TeamIcon = isUserTeam ? Shield : Sword;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-3 py-4",
        LIST_TILE_INSET_CLASS,
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-6 min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
          align === "end" && "@md:flex-row-reverse",
        )}
      >
        <h2
          id={headingId}
          className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <TeamIcon
            className={cn(
              "size-3.5 shrink-0",
              isUserTeam
                ? BATTLE_TEXT_COLORS.team.friendly
                : BATTLE_TEXT_COLORS.team.enemy,
            )}
            aria-hidden
          />
          <span className="truncate">{label}</span>
          {isGroup && (
            <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 text-[11px] leading-4 font-medium tabular-nums text-foreground">
              {team.length}
            </span>
          )}
        </h2>
        {result}
      </div>

      <ul
        className={cn(
          isGroup
            ? "flex flex-wrap gap-1 @2xl:grid @2xl:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] @2xl:gap-x-3 @2xl:gap-y-2"
            : "flex",
          !isGroup && align === "end" && "@md:justify-end",
        )}
      >
        {team.map((member) => (
          <BattleCompactTeamMember
            key={member.originalId}
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
