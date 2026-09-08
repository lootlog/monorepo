import { Fragment, useState } from "react";
import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Medal, Search, Trophy } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@lootlog/ui/components/table";
import { cn } from "cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { formatDurationHuman } from "../events/utils/format-duration";

type RankingRow = GuildGroupFightRankingResponseDtoOutput["ranking"][number];

/** Gold, silver and bronze wrappers for the podium places. */
const PODIUM = [
  {
    icon: Trophy,
    ring: "ring-amber-400/70",
    badge: "bg-amber-400/15 text-amber-500 dark:text-amber-300",
    row: "bg-amber-400/[0.06]",
  },
  {
    icon: Medal,
    ring: "ring-slate-300/70",
    badge: "bg-slate-300/20 text-slate-500 dark:text-slate-300",
    row: "bg-slate-400/[0.06]",
  },
  {
    icon: Medal,
    ring: "ring-orange-500/60",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    row: "bg-orange-500/[0.06]",
  },
] as const;

export function GroupFightRanking({
  ranking,
}: {
  ranking: GuildGroupFightRankingResponseDtoOutput["ranking"];
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [search, setSearch] = useState("");

  // Members are matched by their Discord nick or by any of their characters.
  const needle = search.trim().toLocaleLowerCase("pl");
  const visible = needle
    ? ranking.filter(
        (member) =>
          member.memberName.toLocaleLowerCase("pl").includes(needle) ||
          member.characters.some((character) =>
            character.name.toLocaleLowerCase("pl").includes(needle),
          ),
      )
    : ranking;

  const toggle = (memberId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-8"
          type="search"
          value={search}
          aria-label={t("groupFights.searchMember")}
          placeholder={t("groupFights.searchMember")}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={t("groupFights.ranking")}
        tabIndex={0}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[76px]">
                {t("groupFights.place")}
              </TableHead>
              <TableHead scope="col">{t("groupFights.member")}</TableHead>
              <TableHead scope="col" className="w-[1%]" />
              <TableHead scope="col" className="text-right">
                {t("groupFights.fights")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("groupFights.wins")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("groupFights.losses")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("groupFights.flees")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("groupFights.winRate")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("groupFights.time")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  {t("groupFights.searchEmpty")}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((member) => (
                <MemberRows
                  key={member.memberId}
                  member={member}
                  place={ranking.indexOf(member) + 1}
                  open={expanded.has(member.memberId)}
                  onToggle={() => toggle(member.memberId)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MemberRows({
  member,
  place,
  open,
  onToggle,
}: {
  member: RankingRow;
  place: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const podium = place <= PODIUM.length ? PODIUM[place - 1] : undefined;
  const PodiumIcon = podium?.icon;

  return (
    <Fragment>
      <TableRow className={cn(podium?.row)}>
        <TableCell>
          <span className="flex items-center gap-2">
            <span className="w-4 text-sm font-semibold tabular-nums text-muted-foreground">
              {place}
            </span>
            {PodiumIcon ? (
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  podium?.badge,
                )}
              >
                <PodiumIcon className="size-4" aria-hidden />
              </span>
            ) : null}
          </span>
        </TableCell>
        <TableCell>
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
            <img
              src={getDiscordAvatarUrl(
                member.memberDiscordId,
                member.memberAvatar,
                64,
              )}
              alt=""
              className={cn(
                "size-9 shrink-0 rounded-full object-cover ring-2 ring-border",
                podium?.ring,
              )}
            />
            <span className="font-medium">{member.memberName}</span>
          </span>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
            {t("groupFights.showCharacters")}
          </Button>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {member.fights}
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {member.wins}
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
          {member.losses}
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums text-amber-500 dark:text-amber-400">
          {member.flees}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {member.winRate.toLocaleString("pl-PL", {
            maximumFractionDigits: 1,
          })}
          %
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {formatDurationHuman(member.totalSeconds)}
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow className={cn(podium?.row)}>
          <TableCell colSpan={9} className="bg-muted/30">
            <ul className="flex flex-col gap-2">
              {member.characters.map((character) => (
                <li
                  key={`${character.world}:${character.characterId}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="font-medium">
                    {character.name} ({character.lvl}
                    {character.prof}, {character.world})
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("groupFights.characterStats", {
                      ...character,
                      totalTime: formatDurationHuman(character.totalSeconds),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
