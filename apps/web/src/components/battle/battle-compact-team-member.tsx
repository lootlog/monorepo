import { PlayerTile } from "@/components/battle/player-tile";
import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "@/components/battle/utils/battle-color-palette";
import { BattleDamageTags } from "@/features/user/battle-panel/components/battle-damage-tags";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import { cn } from "cn";
import { Flag, Skull } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleCompactTeamMemberProps = {
  cdnBaseUrl: string;
  /** Group teams collapse to sprites in a narrow column; the stats table carries the names. */
  compact?: boolean;
  isCurrentCharacter: boolean;
  member: Warrior;
  opposingTeam: Warrior[];
};

export const BattleCompactTeamMember: FC<BattleCompactTeamMemberProps> = ({
  cdnBaseUrl,
  compact = false,
  isCurrentCharacter,
  member,
  opposingTeam,
}) => {
  const { t } = useTranslation();

  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border bg-background/40 py-1",
        compact ? "px-1 @2xl:pl-1.5 @2xl:pr-2.5" : "pl-1.5 pr-2.5",
        isCurrentCharacter
          ? BATTLE_SURFACE_COLORS.team.currentCharacterStrongBorder
          : "border-border/70",
      )}
    >
      <div
        className={cn(
          "relative h-9 w-6 shrink-0 overflow-visible",
          member.isDead && "opacity-50 grayscale",
        )}
      >
        <PlayerTile
          player={member}
          className="absolute left-0 top-0 origin-top-left scale-75"
          cdnBaseUrl={cdnBaseUrl}
        />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 text-xs leading-tight",
          compact && "sr-only @2xl:not-sr-only",
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              "truncate font-semibold",
              isCurrentCharacter && BATTLE_TEXT_COLORS.team.friendly,
            )}
          >
            {member.name}
          </span>
          {member.isDead && (
            <Skull
              className="size-3 shrink-0 text-muted-foreground"
              role="img"
              aria-label={t("battleUi.team.status.dead")}
            />
          )}
          {member.surrendered && (
            <Flag
              className="size-3 shrink-0 text-muted-foreground"
              role="img"
              aria-label={t("battleUi.team.status.surrendered")}
            />
          )}
          {member.fled && (
            <EmergencyExitIcon
              size={12}
              className="shrink-0 text-muted-foreground"
              role="img"
              aria-label={t("battleUi.team.status.fled")}
            />
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {member.lvl}
            {member.prof}
          </span>
          <BattleDamageTags team={[member]} opposingTeam={opposingTeam} />
        </div>
      </div>
    </li>
  );
};
