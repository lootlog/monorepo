import type { Battle } from "@/hooks/api/battle-log/use-battles";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { BattleMetadata } from "@/components/battle/battle-metadata";
import { Copy, Lock, Share2, Swords, Trash2 } from "lucide-react";
import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lootlog/ui/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ROUTES } from "@/config/routes";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import { useBattleSharing } from "@/features/user/battle-panel/battle-panel-single-battle/hooks/use-battle-sharing";
import { useDeleteBattle } from "@/hooks/api/battle-log/use-delete-battle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type BattlesListEntryProps = {
  battle: Battle;
  onResultClick?: (result: "won" | "lost" | "flee") => void;
  onWorldClick?: (world: string) => void;
  onPhClick?: () => void;
  onMatchmakingClick?: () => void;
};

export const BattlesListEntry: FC<BattlesListEntryProps> = ({
  battle,
  onResultClick,
  onWorldClick,
  onPhClick,
  onMatchmakingClick,
}) => {
  const { t } = useTranslation();
  const { handleShare, handleCopyLink, handleUnshare, isPending } =
    useBattleSharing();
  const { mutate: deleteBattle } = useDeleteBattle();

  const attackingTeam = battle.warriors.filter((w) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );

  const leftTeam = userTeam?.team === 1 ? attackingTeam : defendingTeam;
  const rightTeam = userTeam?.team === 1 ? defendingTeam : attackingTeam;

  const isWon = !battle.hasFlee && battle.winningTeam === userTeam?.team;
  const isLost = !battle.hasFlee && battle.winningTeam !== userTeam?.team;

  const handleResultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onResultClick) {
      if (battle.hasFlee) {
        onResultClick("flee");
      } else if (isWon) {
        onResultClick("won");
      } else {
        onResultClick("lost");
      }
    }
  };

  const handleWorldClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWorldClick?.(battle.world);
  };

  const handlePhClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPhClick?.();
  };

  const handleMatchmakingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMatchmakingClick?.();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleShare(battle.id);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleCopyLink(battle.id);
  };

  const handleUnshareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleUnshare(battle.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteBattle(
      { battleId: battle.id },
      {
        onSuccess: () => {
          toast.success(t("battlePanel.toasts.battleDeleted"), {
            duration: 3000,
          });
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleDeleteError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  return (
    <Link
      to={ROUTES.user.battlePanel.battle(battle.id) as string}
      className="block"
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border/50 px-3 py-3 transition-colors",
          {
            "bg-green-400/10 hover:bg-green-400/15 border-green-500/30":
              isWon || battle.hasFlee,
            "bg-red-400/10 hover:bg-red-400/15 border-red-500/30": isLost,
          },
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            onClick={handleResultClick}
            className={cn("cursor-pointer whitespace-nowrap text-xs shrink-0", {
              "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500":
                isWon,
              "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive":
                isLost,
              "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500":
                battle.hasFlee,
            })}
          >
            {battle.hasFlee
              ? t("battleUi.metadata.flee")
              : isWon
                ? t("battlePanel.filters.results.won")
                : t("battlePanel.filters.results.lost")}
          </Badge>
          <Badge
            onClick={handleWorldClick}
            variant="outline"
            className="text-xs cursor-pointer border-foreground/50 whitespace-nowrap"
          >
            {capitalizeFirstLetter(battle.world)}
          </Badge>
          {userTeam?.ph !== 0 && userTeam?.ph !== undefined && (
            <Badge
              onClick={handlePhClick}
              variant="outline"
              className="text-xs cursor-pointer border-foreground/50 whitespace-nowrap"
            >
              {t("battlePanel.filters.honorPoints")}
            </Badge>
          )}
          {battle.matchmaking && (
            <Badge
              onClick={handleMatchmakingClick}
              variant="outline"
              className="text-xs cursor-pointer border-purple-500/50 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 whitespace-nowrap"
            >
              {t("battlePanel.filters.matchmaking")}
            </Badge>
          )}
          <div
            className="ml-auto flex items-center gap-1 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span className="text-xs text-muted-foreground mr-1">
              {getRelativeTime(battle.createdAt)}
            </span>
            {battle.public ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyClick}
                      disabled={isPending}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("battlePanel.actions.copyLink")}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleUnshareClick}
                      disabled={isPending}
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("battlePanel.actions.hide")}
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleShareClick}
                    disabled={isPending}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("battlePanel.actions.share")}
                </TooltipContent>
              </Tooltip>
            )}
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  {t("battlePanel.actions.delete")}
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("battlePanel.dialogs.deleteBattle.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("battlePanel.dialogs.deleteBattle.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={handleDeleteClick}>
                      {t("battlePanel.dialogs.deleteBattle.confirm")}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
            {leftTeam.map((w) => (
              <div key={w.id} className="flex items-center gap-1">
                <PlayerTile player={w} className="scale-75" />
                <span
                  className={cn("text-xs font-medium", {
                    "text-green-500": w.originalId === battle.characterId,
                  })}
                >
                  {w.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({w.lvl}
                    {w.prof})
                  </span>
                </span>
              </div>
            ))}
          </div>

          <Swords className="size-5 text-muted-foreground shrink-0" />

          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
            {rightTeam.map((w) => (
              <div key={w.id} className="flex items-center gap-1">
                <PlayerTile player={w} className="scale-75" />
                <span className="text-xs font-medium">
                  {w.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({w.lvl}
                    {w.prof})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <BattleMetadata
          battle={battle}
          align="left"
          className="p-0 gap-3"
          labels={{
            startTime: t("battleUi.metadata.startTime"),
            duration: t("battleUi.metadata.duration"),
            battleType: t("battleUi.metadata.battleType"),
            public: t("battleUi.metadata.public"),
            private: t("battleUi.metadata.private"),
            publicTooltip: t("battleUi.metadata.publicTooltip"),
            privateTooltip: t("battleUi.metadata.privateTooltip"),
          }}
        />
      </div>
    </Link>
  );
};
