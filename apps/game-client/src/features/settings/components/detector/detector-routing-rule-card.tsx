import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DetectorRoutingGuildPreviewTile } from "@/features/settings/components/detector/detector-routing-guild-preview-tile";
import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import type { DetectorRoutingSettingsTranslations } from "@/features/settings/components/detector/detector-routing-settings-translations";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import { ChevronDown, Trash2 } from "lucide-react";
import type { FC, KeyboardEvent, ReactNode } from "react";

const VISIBLE_PREVIEW_GUILDS_COUNT = 3;

type DetectorRoutingRuleCardProps = {
  fieldIdInput: ReactNode;
  guilds: Guild[] | undefined;
  index: number;
  isOpen: boolean;
  label: string;
  maxLevel: number;
  maxLevelField: ReactNode;
  minLevel: number;
  minLevelField: ReactNode;
  nameField: ReactNode;
  world?: string;
  worldField: ReactNode;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  onToggleGuild: (guildId: string) => void;
  selectedGuildIds: string[];
  translations: DetectorRoutingSettingsTranslations;
};

export const DetectorRoutingRuleCard: FC<DetectorRoutingRuleCardProps> = ({
  fieldIdInput,
  guilds,
  index,
  isOpen,
  label,
  maxLevel,
  maxLevelField,
  minLevel,
  minLevelField,
  nameField,
  world,
  worldField,
  onOpenChange,
  onRemove,
  onToggleGuild,
  selectedGuildIds,
  translations,
}) => {
  const selectedGuilds =
    guilds?.filter((guild) => selectedGuildIds.includes(guild.id)) ?? [];
  const visiblePreviewGuilds = selectedGuilds.slice(
    0,
    VISIBLE_PREVIEW_GUILDS_COUNT,
  );
  const hiddenPreviewGuildsCount = Math.max(
    selectedGuildIds.length - visiblePreviewGuilds.length,
    0,
  );
  const toggleOpen = () => {
    onOpenChange(!isOpen);
  };
  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  return (
    <TooltipProvider>
      <Collapsible
        open={isOpen}
        onOpenChange={onOpenChange}
        className={cn(
          "ll:group ll:overflow-hidden ll:rounded-md ll:border ll:bg-gray-950/78 ll:transition-colors",
          isOpen
            ? "ll:border-sky-300/55 ll:shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_16px_40px_rgba(2,132,199,0.12)]"
            : "ll:border-gray-700/90",
        )}
      >
        {fieldIdInput}

        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-label={translations.toggleRuleLabel(index + 1)}
          className="ll:flex ll:items-center ll:gap-3 ll:p-2.5 ll:transition-colors group-hover:ll:bg-white/4 ll:cursor-pointer"
          onClick={toggleOpen}
          onKeyDown={handleHeaderKeyDown}
        >
          <div className="ll:min-w-0 ll:flex-1">
            <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-4 ll:text-left">
              <div className="ll:min-w-0 ll:flex-1 ll:flex ll:flex-col ll:gap-3">
                <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-1.5">
                  <span className="ll:text-[12px] ll:font-semibold ll:text-white">
                    {label}
                  </span>
                  <span className="ll:rounded-sm ll:border ll:border-sky-300/35 ll:bg-sky-400/10 ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium ll:text-sky-100">
                    {translations.selectedGuildsBadge(selectedGuildIds.length)}
                  </span>
                </div>
                <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-1.5">
                  <span className="ll:rounded-sm ll:border ll:border-gray-600/70 ll:bg-black/20 ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium ll:text-gray-200">
                    {translations.minLevelBadge(minLevel)}
                  </span>
                  <span className="ll:rounded-sm ll:border ll:border-gray-600/70 ll:bg-black/20 ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium ll:text-gray-200">
                    {translations.maxLevelBadge(maxLevel)}
                  </span>
                  {world ? (
                    <span className="ll:rounded-sm ll:border ll:border-gray-600/70 ll:bg-black/20 ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium ll:text-gray-200">
                      {translations.worldBadge(world)}
                    </span>
                  ) : null}
                </div>
              </div>

              {visiblePreviewGuilds.length > 0 ? (
                <div className="ll:ml-auto ll:flex ll:min-w-0 ll:flex-wrap ll:items-center ll:gap-1.5 ll:self-center">
                  {visiblePreviewGuilds.map((guild) => (
                    <DetectorRoutingGuildPreviewTile
                      key={guild.id}
                      guild={guild}
                    />
                  ))}
                  {hiddenPreviewGuildsCount > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          aria-label={translations.guildOverflowTooltip(
                            hiddenPreviewGuildsCount,
                          )}
                          className="ll:inline-flex ll:h-7 ll:min-w-7 ll:items-center ll:justify-center ll:rounded-sm ll:border ll:border-dashed ll:border-gray-500/70 ll:bg-black/20 ll:px-1.5 ll:text-[10px] ll:font-semibold ll:text-gray-300"
                        >
                          {translations.guildOverflowLabel(
                            hiddenPreviewGuildsCount,
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="ll:z-500">
                        <p className="ll:text-xs ll:font-semibold">
                          {translations.guildOverflowTooltip(
                            hiddenPreviewGuildsCount,
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              ) : (
                <span className="ll:ml-auto ll:rounded-sm ll:border ll:border-dashed ll:border-gray-600/70 ll:bg-black/20 ll:px-2 ll:py-1 ll:text-[10px] ll:font-medium ll:text-gray-400 ll:self-center">
                  {translations.noGuildsSelected}
                </span>
              )}
            </div>
          </div>

          <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-2.5 ll:pl-1">
            <Button
              type="button"
              variant="destructive"
              className="ll:size-7 ll:px-0"
              aria-label={translations.deleteRuleLabel(index + 1)}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 size={12} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ll:size-7 ll:border-gray-600/70 ll:bg-black/20 ll:px-0 ll:hover:bg-white/8"
              aria-label={translations.toggleRuleLabel(index + 1)}
              onClick={(event) => {
                event.stopPropagation();
                toggleOpen();
              }}
            >
              <ChevronDown
                size={14}
                className={cn(
                  "ll:transition-transform ll:duration-200",
                  isOpen && "ll:rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        <CollapsibleContent className="ll:border-t ll:border-white/10">
          <div className="ll:flex ll:flex-col ll:gap-3">
            {nameField}

            <div className="ll:grid ll:grid-cols-3 ll:gap-2">
              {minLevelField}
              {maxLevelField}
              {worldField}
            </div>

            <div className="ll:flex ll:flex-col ll:gap-2">
              <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
                {translations.guildSelectionLabel}
              </span>
              <SettingsGuildSelectionGrid
                emptyStateLabel={translations.noGuildsAvailable}
                guilds={guilds}
                onToggle={onToggleGuild}
                selectedGuildIds={selectedGuildIds}
                variant="compact"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
};
