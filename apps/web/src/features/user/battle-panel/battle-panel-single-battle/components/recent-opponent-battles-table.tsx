import { PlayerTile } from "@/components/battle";
import { ROUTES } from "@/config/routes";
import type { Battle, PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useRecentOpponentBattles } from "../hooks/use-recent-opponent-battles";

type RecentOpponentBattlesTableProps = {
  battle: Battle | undefined;
  className?: string;
};

type RecentOpponentWarrior = PlayerVsPlayerBattle["userWarrior"];

const getRecentBattleRowClassName = (battle: PlayerVsPlayerBattle) => {
  if (battle.userWarrior.name === battle.winner) {
    return "bg-green-500/5 hover:bg-green-500/10";
  }

  return "bg-red-500/5 hover:bg-red-500/10";
};

const renderWarrior = (warrior: RecentOpponentWarrior) => (
  <div className="flex min-w-0 items-center gap-1">
    <PlayerTile
      player={warrior}
      className="h-9 w-6 origin-top-left scale-[0.72]"
    />
    <div className="min-w-0">
      <div className="truncate text-xs font-medium">{warrior.name}</div>
      <div className="text-[10px] text-muted-foreground">
        {warrior.lvl}
        {warrior.prof}
      </div>
    </div>
  </div>
);

export function RecentOpponentBattlesTable({
  battle,
  className,
}: RecentOpponentBattlesTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { battles, context, isError, isLoading } =
    useRecentOpponentBattles(battle);

  const handleOpenBattle = (battleId: string) => {
    navigate({
      to: ROUTES.user.battlePanel.battle(battleId) as string,
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    battleId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleOpenBattle(battleId);
  };

  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      {!context ? (
        <div className="p-3">
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.unsupportedDescription")}
          </div>
        </div>
      ) : isLoading ? (
        <div className="p-2">
          <Table className="border-b">
            <TableBody>
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index} className="h-14 border-b border-border">
                  <TableCell>
                    <div className="h-8 rounded-md bg-muted/40" />
                  </TableCell>
                  <TableCell className="w-8">
                    <div className="h-4 rounded bg-muted/40" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 rounded-md bg-muted/40" />
                  </TableCell>
                  <TableCell className="w-[88px]">
                    <div className="h-4 rounded bg-muted/40" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isError ? (
        <div className="p-3">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("battlePanel.single.recentOpponent.error")}
          </div>
        </div>
      ) : battles.length === 0 ? (
        <div className="p-3">
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.empty")}
          </div>
        </div>
      ) : (
        <Table className="table-fixed border-b">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-5" />
            <col className="w-[34%]" />
            <col className="w-[76px]" />
          </colgroup>
          <TableBody>
            {battles.map((recentBattle) => {
              const exactTime = format(
                new Date(recentBattle.createdAt),
                "dd.MM.yyyy HH:mm",
              );

              return (
                <TableRow
                  key={recentBattle.battleId}
                  role="link"
                  tabIndex={0}
                  aria-label={t("battlePanel.list.openBattle")}
                  className={cn(
                    "h-12 cursor-pointer border-b border-border transition-colors [&_td:first-child]:!pl-2 [&_td:last-child]:!pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                    getRecentBattleRowClassName(recentBattle),
                  )}
                  onClick={() => handleOpenBattle(recentBattle.battleId)}
                  onKeyDown={(event) =>
                    handleRowKeyDown(event, recentBattle.battleId)
                  }
                >
                  <TableCell className="min-w-0 py-1 pl-2 pr-1">
                    {renderWarrior(recentBattle.userWarrior)}
                  </TableCell>
                  <TableCell className="px-0 py-1 text-center text-[9px] font-medium uppercase text-muted-foreground/80">
                    {t("battlePanel.single.recentOpponent.versus")}
                  </TableCell>
                  <TableCell className="min-w-0 px-1 py-1">
                    {renderWarrior(recentBattle.opponentWarrior)}
                  </TableCell>
                  <TableCell className="py-1 pl-1 pr-2 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block max-w-full truncate text-xs font-medium text-muted-foreground">
                          {getRelativeTime(recentBattle.createdAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{exactTime}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </ScrollArea>
  );
}
