import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";
import type { FactionWarLeaderboardEntry } from "./faction-war-queries";

type FactionWarPlayerNameProps = {
  entry: FactionWarLeaderboardEntry;
  className?: string;
};

/** A ranked character, or "hidden player" for one who hid their name; the caller's own is marked. */
export const FactionWarPlayerName = ({
  entry,
  className,
}: FactionWarPlayerNameProps) => {
  const { t } = useTranslation();

  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "truncate font-semibold",
          entry.characterName === null && "text-muted-foreground italic",
        )}
      >
        {entry.characterName ?? t("factionWar.ranking.hiddenPlayer")}
      </span>
      {entry.isMe && (
        <Badge variant="secondary" className="shrink-0">
          {t("factionWar.ranking.you")}
        </Badge>
      )}
    </span>
  );
};
