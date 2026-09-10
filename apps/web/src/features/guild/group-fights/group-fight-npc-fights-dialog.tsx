import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import {
  useGroupFightsControllerGetGuildGroupFights,
  type GroupFightsControllerGetGuildGroupFightsParams,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Badge } from "@lootlog/ui/components/badge";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@lootlog/ui/components/table";
import { formatDurationHuman } from "../events/utils/format-duration";
import { GroupFightResultBadge } from "./group-fight-result-badge";

const PAGE_SIZE = 15;
/** Names shown inline; the rest stays behind the tooltip. */
const ROSTER_PREVIEW = 3;

type RosterPlayer = { name: string; lvl: number; prof: string; fled: boolean };

const describePlayer = (player: RosterPlayer) =>
  `${player.name} (${player.lvl}${player.prof})`;

function TeamRoster({
  label,
  players,
}: {
  label: string;
  players: RosterPlayer[];
}) {
  if (players.length === 0) {
    return (
      <div>
        <span className="text-muted-foreground">{label}: </span>—
      </div>
    );
  }
  const preview = players.slice(0, ROSTER_PREVIEW);
  const hidden = players.length - preview.length;
  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="w-fit cursor-default border-b border-dotted border-muted-foreground/40" />
          }
        >
          <span className="text-muted-foreground">{label}: </span>
          {preview.map((player) => player.name).join(", ")}
          {hidden > 0 ? (
            <span className="text-muted-foreground"> +{hidden}</span>
          ) : null}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="mb-1 font-medium">{label}</p>
          <ul className="flex flex-col gap-0.5">
            {players.map((player) => (
              <li key={`${player.name}:${player.lvl}`}>
                {describePlayer(player)}
                {player.fled ? " ⚑" : ""}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function GroupFightNpcFightsDialog({
  guildId,
  npcName,
  mapName,
  icon,
  lvl,
  npcType,
  filters,
}: {
  guildId: string;
  npcName: string;
  mapName: string;
  icon: string | null;
  lvl: number | null;
  npcType: "ELITE2" | "TITAN";
  filters: GroupFightsControllerGetGuildGroupFightsParams;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [day, setDay] = useState("");
  const params: GroupFightsControllerGetGuildGroupFightsParams = {
    ...filters,
    npcName,
    limit: String(PAGE_SIZE),
    cursor: String(cursor),
  };
  if (day) params.day = day;
  const query = useGroupFightsControllerGetGuildGroupFights(
    { guildId },
    params,
    { query: { enabled: open } },
  );
  const fights = query.data?.fights ?? [];
  const pagination = query.data?.pagination;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Eye className="size-4" aria-hidden />
        {t("groupFights.showDetails")}
      </DialogTrigger>
      <DialogContent className="flex w-[min(96vw,1200px)] flex-col gap-4 p-6 sm:max-w-[min(96vw,1200px)]">
        <DialogHeader className="flex-row items-center gap-4">
          <NpcTile
            imageClassName="max-h-28 max-w-24"
            npc={{ icon, lvl: lvl ?? undefined, name: npcName }}
            levelLabel={(level) => t("groupFights.level", { lvl: level })}
          />
          <div className="flex flex-col gap-1">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
              {npcName}
              {lvl === null ? null : (
                <span className="text-base font-normal text-muted-foreground">
                  {t("groupFights.level", { lvl })}
                </span>
              )}
              <Badge variant={npcType === "TITAN" ? "default" : "secondary"}>
                {t(`groupFights.mapType.${npcType}`)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {mapName}
              {query.data
                ? ` · ${t("groupFights.fightsCount", { count: query.data.pagination.total })}`
                : ""}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="text-sm text-muted-foreground"
            htmlFor={`group-fight-day-${npcName}`}
          >
            {t("groupFights.day")}
          </label>
          <Input
            id={`group-fight-day-${npcName}`}
            type="date"
            className="w-44"
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
              setCursor(0);
            }}
          />
          {day ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDay("");
                setCursor(0);
              }}
            >
              {t("groupFights.allDays")}
            </Button>
          ) : null}
        </div>
        {query.isPending ? (
          <p role="status">{t("groupFights.loading")}</p>
        ) : null}
        {query.isError ? <p>{t("groupFights.error")}</p> : null}
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]">#</TableHead>
                <TableHead>{t("groupFights.date")}</TableHead>
                <TableHead>{t("groupFights.result")}</TableHead>
                <TableHead>{t("groupFights.teams")}</TableHead>
                <TableHead className="whitespace-nowrap">
                  {t("groupFights.teamSizes")}
                </TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fights.map((fight, index) => {
                const battleId = fight.battleIds[0];
                const ourSize =
                  fight.ourTeam === 1 ? fight.teamOneSize : fight.teamTwoSize;
                const enemySize =
                  fight.ourTeam === 1 ? fight.teamTwoSize : fight.teamOneSize;
                return (
                  <TableRow key={fight.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {cursor + index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div>{formatDateTime(fight.endedAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fight.world} ·{" "}
                        {formatDurationHuman(fight.durationSeconds)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <GroupFightResultBadge result={fight.result} />
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="flex flex-col gap-1 truncate text-xs">
                        {([1, 2] as const).map((team) => (
                          <TeamRoster
                            key={team}
                            label={t("groupFights.team", { team })}
                            players={fight.roster.filter(
                              (player) => player.team === team,
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {ourSize} vs {enemySize}
                    </TableCell>
                    <TableCell>
                      {battleId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link
                              to="/battles/$id"
                              params={{ id: battleId }}
                              target="_blank"
                            />
                          }
                        >
                          {t("groupFights.openBattleLog")}
                          <ArrowUpRight className="size-4" aria-hidden />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("groupFights.noBattleLog")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!query.isPending && fights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {t("groupFights.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.total > 0 ? (
          <nav className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={cursor === 0 || query.isFetching}
              onClick={() => setCursor(Math.max(0, cursor - PAGE_SIZE))}
            >
              <ChevronLeft className="size-4" aria-hidden />
              {t("groupFights.previous")}
            </Button>
            <span className="min-w-32 text-center text-sm tabular-nums">
              {t("groupFights.pageOfTotal", {
                page: Math.floor(cursor / PAGE_SIZE) + 1,
                pages: Math.max(1, Math.ceil(pagination.total / PAGE_SIZE)),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext || query.isFetching}
              onClick={() => setCursor(cursor + PAGE_SIZE)}
            >
              {t("groupFights.next")}
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </nav>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
