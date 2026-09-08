import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@lootlog/ui/components/combobox";
import { cn } from "cn";
import { GroupFightNpcFightsDialog } from "./group-fight-npc-fights-dialog";
import { formatDurationHuman } from "../events/utils/format-duration";

type NpcSummary = GuildGroupFightRankingResponseDtoOutput["npcs"][number];

export function GroupFightNpcs({
  npcs,
  selectedNpcName,
  onSelect,
  onClear,
  guildId,
  filters,
}: {
  npcs: NpcSummary[];
  selectedNpcName?: string;
  onSelect: (npc: NpcSummary) => void;
  onClear: () => void;
  guildId: string;
  filters: Record<string, string | undefined>;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const needle = search.trim().toLocaleLowerCase("pl");
  const matches = (npc: NpcSummary) =>
    npc.name.toLocaleLowerCase("pl").includes(needle) ||
    npc.mapName.toLocaleLowerCase("pl").includes(needle);
  const visible = needle ? npcs.filter(matches) : npcs;
  // Suggestions follow what is typed, so the list stays usable with many NPCs.
  const suggestions = (needle ? npcs.filter(matches) : npcs)
    .map((npc) => npc.name)
    .slice(0, 12);

  return (
    <section
      aria-labelledby="group-fight-npcs-title"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="group-fight-npcs-title" className="text-lg font-semibold">
            {t("groupFights.npcsTitle")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Combobox
            items={suggestions}
            filteredItems={suggestions}
            inputValue={search}
            onInputValueChange={setSearch}
            value={selectedNpcName ?? null}
            onValueChange={(value) => {
              const picked = npcs.find((npc) => npc.name === value);
              if (picked) onSelect(picked);
            }}
          >
            <ComboboxInput
              className="w-64"
              aria-label={t("groupFights.searchNpc")}
              placeholder={t("groupFights.searchNpc")}
            />
            <ComboboxContent>
              <ComboboxList>
                {suggestions.map((name) => (
                  <ComboboxItem key={name} value={name}>
                    {name}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {selectedNpcName ? (
            <Button variant="outline" size="sm" onClick={onClear}>
              {t("groupFights.clearNpc")}
            </Button>
          ) : null}
        </div>
      </div>
      {visible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{t("groupFights.npcsEmpty")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[76px]">
                  <span className="sr-only">{t("groupFights.npc")}</span>
                </TableHead>
                <TableHead>{t("groupFights.npc")}</TableHead>
                <TableHead>{t("groupFights.map")}</TableHead>
                <TableHead className="text-right">
                  {t("groupFights.fights")}
                </TableHead>
                <TableHead className="text-right">
                  {t("groupFights.wins")}
                </TableHead>
                <TableHead className="text-right">
                  {t("groupFights.losses")}
                </TableHead>
                <TableHead
                  className="text-right"
                  title={t("groupFights.fleesHint")}
                >
                  {t("groupFights.flees")}
                </TableHead>
                <TableHead className="text-right">
                  {t("groupFights.winRate")}
                </TableHead>
                <TableHead className="text-right">
                  {t("groupFights.totalTime")}
                </TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((npc) => {
                const selected = selectedNpcName === npc.name;
                return (
                  <TableRow
                    key={`${npc.name}:${npc.npcType}:${npc.mapId ?? npc.mapName}`}
                    className={cn(selected && "bg-muted/60")}
                    data-state={selected ? "selected" : undefined}
                  >
                    <TableCell>
                      <NpcTile
                        imageClassName="max-h-20 max-w-16"
                        npc={{
                          icon: npc.icon,
                          lvl: npc.lvl ?? undefined,
                          name: npc.name,
                        }}
                        levelLabel={(level) =>
                          t("groupFights.level", { lvl: level })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{npc.name}</span>
                        <span className="flex items-center gap-2">
                          {npc.lvl === null ? null : (
                            <span className="text-xs text-muted-foreground">
                              {t("groupFights.level", { lvl: npc.lvl })}
                            </span>
                          )}
                          <Badge
                            variant={
                              npc.npcType === "TITAN" ? "default" : "secondary"
                            }
                          >
                            {t(`groupFights.mapType.${npc.npcType}`)}
                          </Badge>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {npc.mapName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {npc.totalFights}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      {npc.wins}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-red-600 dark:text-red-400">
                      {npc.losses}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {npc.flees}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {npc.totalFights === 0
                        ? "—"
                        : `${(
                            (npc.wins / npc.totalFights) *
                            100
                          ).toLocaleString("pl-PL", {
                            maximumFractionDigits: 1,
                          })}%`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatDurationHuman(npc.totalDurationSeconds)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant={selected ? "secondary" : "ghost"}
                          size="sm"
                          aria-pressed={selected}
                          aria-label={t("groupFights.selectNpc", {
                            name: npc.name,
                          })}
                          onClick={() => (selected ? onClear() : onSelect(npc))}
                        >
                          {selected
                            ? t("groupFights.selected")
                            : t("groupFights.filter")}
                        </Button>
                        <GroupFightNpcFightsDialog
                          guildId={guildId}
                          npcName={npc.name}
                          mapName={npc.mapName}
                          icon={npc.icon}
                          lvl={npc.lvl}
                          npcType={npc.npcType}
                          filters={filters}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
