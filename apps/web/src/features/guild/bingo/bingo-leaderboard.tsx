import type { BingoBoardDetailResponseDtoLeaderboardItem } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { cn } from "cn";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoLeaderboardProps = {
  readonly entries: ReadonlyArray<BingoBoardDetailResponseDtoLeaderboardItem>;
  readonly selectedMemberId: number;
  readonly viewerMemberId: number;
  readonly onSelectMember: (memberId: number) => void;
};

export const BingoLeaderboard = ({
  entries,
  selectedMemberId,
  viewerMemberId,
  onSelectMember,
}: BingoLeaderboardProps) => {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <EmptyState compact icon={Trophy} title={t("bingo.leaderboard.empty")} />
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {entries.map((entry) => {
        const isSelected = entry.member.id === selectedMemberId;
        const isViewer = entry.member.id === viewerMemberId;

        return (
          <button
            key={entry.member.id}
            type="button"
            onClick={() => onSelectMember(entry.member.id)}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40",
              isSelected && "bg-primary/10",
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                #{entry.rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {entry.member.name}
                  </span>
                  {isViewer ? (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {t("bingo.leaderboard.you")}
                    </Badge>
                  ) : null}
                  {entry.isBlackout ? (
                    <Badge variant="ready" className="px-1.5 py-0 text-[10px]">
                      {t("bingo.stats.blackout")}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("bingo.units.tiles", { done: entry.completedTileCount })} ·{" "}
                  {t("bingo.units.lines", {
                    count: entry.completedLines.length,
                  })}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums text-foreground">
                {t("bingo.units.points", { points: entry.totalPoints })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
