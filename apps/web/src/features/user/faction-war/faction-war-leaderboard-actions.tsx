import { Ban, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import type { FactionWarLeaderboardEntry } from "./faction-war-queries";

export type FactionWarModeratedPlayer = {
  userId: string;
  characterName: string | null;
};

type FactionWarLeaderboardActionsProps = {
  entry: FactionWarLeaderboardEntry;
  onDisqualify: (player: FactionWarModeratedPlayer) => void;
};

/**
 * A war admin's actions on one ranked player. The server names the account
 * only to admins, so a row without it offers nothing, and neither does the
 * admin's own row.
 */
export const FactionWarLeaderboardActions = ({
  entry,
  onDisqualify,
}: FactionWarLeaderboardActionsProps) => {
  const { t } = useTranslation();
  const { userId, characterName } = entry;

  if (userId === null || entry.isMe) return null;

  const name = characterName ?? t("factionWar.ranking.hiddenPlayer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("factionWar.moderation.actions", { name })}
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDisqualify({ userId, characterName })}
        >
          <Ban className="size-4" />
          {t("factionWar.moderation.disqualify")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
