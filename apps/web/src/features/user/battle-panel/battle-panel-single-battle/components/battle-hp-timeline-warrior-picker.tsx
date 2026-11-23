import type {
  BattleHpTimelineGroupSelection,
  BattleHpTimelineGroupTeam,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-group-series";
import { BattleHpTimelineSeriesSwatch } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-series-swatch";
import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { Check, RotateCcw, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type BattleHpTimelineWarriorPickerProps = {
  teams: BattleHpTimelineGroupTeam[];
  selection: BattleHpTimelineGroupSelection;
  getTeamLabel: (team: number) => string;
  onSelectionChange: (selection: BattleHpTimelineGroupSelection) => void;
  onReset: () => void;
};

const toggleValue = <T,>(values: T[], value: T) =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

export function BattleHpTimelineWarriorPicker({
  teams,
  selection,
  getTeamLabel,
  onSelectionChange,
  onReset,
}: BattleHpTimelineWarriorPickerProps) {
  const { t } = useTranslation();
  const openLabel = t("battlePanel.single.chart.group.open");
  const resetLabel = t("battlePanel.single.chart.group.reset");

  const toggleTeamMembers = (team: BattleHpTimelineGroupTeam) => {
    const memberIds = team.members.map((member) => member.warriorId);

    const isEveryMemberSelected = memberIds.every((warriorId) =>
      selection.warriorIds.includes(warriorId),
    );

    onSelectionChange({
      ...selection,
      warriorIds: isEveryMemberSelected
        ? selection.warriorIds.filter(
            (warriorId) => !memberIds.includes(warriorId),
          )
        : [...new Set([...selection.warriorIds, ...memberIds])],
    });
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render=<PopoverTrigger
            render={
              <Button aria-label={openLabel} variant="ghost" size="icon-sm">
                <Users className="size-3.5" />
              </Button>
            }
          />
        />
        <TooltipContent>{openLabel}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="w-72 overflow-hidden p-0 sm:w-80"
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-1.5">
          <h3 className="text-sm font-semibold">
            {t("battlePanel.single.chart.group.title")}
          </h3>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={resetLabel}
                  variant="ghost"
                  size="icon-sm"
                  onClick={onReset}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>{resetLabel}</TooltipContent>
          </Tooltip>
        </div>
        <Separator />
        <Command label={openLabel} className="rounded-none bg-transparent">
          <CommandInput
            className="h-9 py-2"
            placeholder={t("battlePanel.single.chart.group.searchPlaceholder")}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {t("battlePanel.single.chart.group.empty")}
            </CommandEmpty>
            {teams.map((team) => {
              const teamLabel = getTeamLabel(team.team);

              const isEveryMemberSelected = team.members.every((member) =>
                selection.warriorIds.includes(member.warriorId),
              );

              const isAverageSelected = selection.averageTeams.includes(
                team.team,
              );

              return (
                <CommandGroup key={team.team} heading={teamLabel}>
                  <CommandItem
                    value={`team-${team.team}-all`}
                    keywords={[teamLabel]}
                    aria-checked={isEveryMemberSelected}
                    className="min-h-9 rounded-md px-2.5"
                    onSelect={() => toggleTeamMembers(team)}
                  >
                    <Users aria-hidden="true" className="size-3.5" />
                    <span className="min-w-0 flex-1 truncate">
                      {t("battlePanel.single.chart.group.allMembers")}
                    </span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-4",
                        isEveryMemberSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                  <CommandItem
                    value={`team-${team.team}-average`}
                    keywords={[teamLabel]}
                    aria-checked={isAverageSelected}
                    className="min-h-9 rounded-md px-2.5"
                    onSelect={() =>
                      onSelectionChange({
                        ...selection,
                        averageTeams: toggleValue(
                          selection.averageTeams,
                          team.team,
                        ),
                      })
                    }
                  >
                    <BattleHpTimelineSeriesSwatch
                      color={team.color}
                      isAverage
                      className="w-3.5"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {t("battlePanel.single.chart.group.average")}
                    </span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-4",
                        isAverageSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                  {team.members.map((member) => {
                    const isSelected = selection.warriorIds.includes(
                      member.warriorId,
                    );

                    return (
                      <CommandItem
                        key={member.warriorId}
                        value={`warrior-${member.warriorId}`}
                        keywords={[member.name]}
                        aria-checked={isSelected}
                        className="min-h-9 rounded-md px-2.5"
                        onSelect={() =>
                          onSelectionChange({
                            ...selection,
                            warriorIds: toggleValue(
                              selection.warriorIds,
                              member.warriorId,
                            ),
                          })
                        }
                      >
                        <BattleHpTimelineSeriesSwatch
                          color={member.color}
                          isAverage={false}
                          className="mx-[3px]"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {member.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {member.lvl}
                          {member.prof}
                        </span>
                        <Check
                          aria-hidden="true"
                          className={cn(
                            "size-4",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
