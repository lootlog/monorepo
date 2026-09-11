import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsRow } from "@/components/settings/settings-row";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import { ChevronRight, Trash2 } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type DetectorRoutingRuleCardProps = {
  fieldIdInput: ReactNode;
  guilds: Guild[] | undefined;
  isOpen: boolean;
  label: string;
  minLevel: number;
  maxLevel: number;
  world?: string;
  selectedGuildIds: string[];
  nameInputId: string;
  nameField: ReactNode;
  levelFields: ReactNode;
  worldInputId: string;
  worldField: ReactNode;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  onToggleGuild: (guildId: string) => void;
};

export const DetectorRoutingRuleCard: FC<DetectorRoutingRuleCardProps> = ({
  fieldIdInput,
  guilds,
  isOpen,
  label,
  minLevel,
  maxLevel,
  world,
  selectedGuildIds,
  nameInputId,
  nameField,
  levelFields,
  worldInputId,
  worldField,
  onOpenChange,
  onRemove,
  onToggleGuild,
}) => {
  const { t } = useTranslation();

  const summary = [
    t("settings.detector.routing.summaryLevels", {
      min: minLevel,
      max: maxLevel,
    }),
    world ? t("settings.detector.routing.summaryWorld", { world }) : null,
    t("settings.detector.routing.summaryGuilds", {
      count: selectedGuildIds.length,
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SettingsPanel className="ll:px-0 ll:py-0">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        {fieldIdInput}
        <div className="ll:flex ll:min-h-7 ll:items-center ll:gap-2 ll:pr-1">
          <CollapsibleTrigger
            aria-label={t("settings.detector.routing.toggleRuleLabel", {
              name: label,
            })}
            className="ll-custom-cursor-pointer ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-2 ll:py-1.5 ll:text-left ll:text-xs ll:font-semibold ll:text-gray-100 ll:hover:bg-white/5 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "ll:size-3.5 ll:shrink-0 ll:transition-transform",
                isOpen && "ll:rotate-90",
              )}
            />
            <span className="ll:min-w-0 ll:truncate">{label}</span>
            <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:font-normal ll:text-muted-foreground">
              {summary}
            </span>
          </CollapsibleTrigger>
          <SettingsIconButton
            variant="destructive"
            label={t("settings.detector.routing.deleteRuleLabel", {
              name: label,
            })}
            onClick={onRemove}
          >
            <Trash2 />
          </SettingsIconButton>
        </div>
        <CollapsibleContent className="ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/20 ll:[&>div]:px-0 ll:[&>div]:pb-1 ll:[&>div]:pt-1">
          <div className="ll:flex ll:flex-col ll:gap-0.5">
            <SettingsRow
              htmlFor={nameInputId}
              label={t("settings.detector.routing.ruleNameLabel")}
              description={t("settings.detector.routing.ruleNameDescription")}
              controlClassName="ll:w-48"
            >
              {nameField}
            </SettingsRow>
            <SettingsRow
              label={t("settings.detector.routing.levelRangeLabel")}
              description={t("settings.detector.routing.levelRangeDescription")}
              controlClassName="ll:gap-1"
            >
              {levelFields}
            </SettingsRow>
            <SettingsRow
              htmlFor={worldInputId}
              label={t("settings.detector.routing.worldLabel")}
              description={t("settings.detector.routing.worldDescription")}
              controlClassName="ll:w-48"
            >
              {worldField}
            </SettingsRow>
            <SettingsRow
              layout="stacked"
              label={t("settings.detector.routing.guildSelectionLabel")}
              description={t(
                "settings.detector.routing.guildSelectionDescription",
              )}
            >
              <SettingsGuildPicker
                aria-label={t("settings.detector.routing.guildSelectionLabel")}
                emptyStateLabel={t(
                  "settings.detector.routing.noGuildsAvailable",
                )}
                guilds={guilds}
                onToggle={onToggleGuild}
                selectedGuildIds={selectedGuildIds}
                className="ll:-mx-1 ll:w-[calc(100%+0.5rem)]"
              />
            </SettingsRow>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SettingsPanel>
  );
};
