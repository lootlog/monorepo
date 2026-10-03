import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Server, Skull } from "lucide-react";
import { cn } from "cn";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import {
  ACTIVITY_FEED_NPC_CATEGORIES,
  type ActivityFeedNpcCategory,
  type ActivityFeedSettings,
} from "@lootlog/domain/activity-feed";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { NpcTypeIcon } from "@lootlog/ui/components/npc-type-icon";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { NPC_CATEGORY_APPEARANCE } from "../npc-category-appearance";

type Props = {
  settings: ActivityFeedSettings;
  disabled: boolean;
  onChange: (patch: Partial<ActivityFeedSettings>) => void;
};

const toggle = <T,>(values: ReadonlyArray<T>, value: T) =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

export function LiveFeedFilters({ settings, disabled, onChange }: Props) {
  const { t } = useTranslation();
  const lootOnlyId = useId();

  const { data: guilds = [] } =
    useUsersControllerGetCurrentUserAccessibleGuilds();

  const includedGuildIds = guilds
    .filter((guild) => !settings.excludedGuildIds.includes(guild.id))
    .map((guild) => guild.id);

  const includedCategories = ACTIVITY_FEED_NPC_CATEGORIES.filter(
    (category) => !settings.excludedNpcCategories.includes(category),
  );

  const categoryLabel = (category: ActivityFeedNpcCategory) =>
    category === "OTHER"
      ? t("statistics.feedOtherNpcs")
      : t(`npcType.${category}`);

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border/70 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
      <FilterPopover
        icon={Server}
        multiSelect
        options={guilds.map((guild) => ({
          value: guild.id,
          label: guild.name,
          render: () => (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="size-5 rounded-md" aria-hidden>
                <AvatarImage src={guild.icon ?? undefined} alt="" />
                <AvatarFallback className="rounded-none text-[0.625rem] font-medium">
                  {guild.name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{guild.name}</span>
            </span>
          ),
        }))}
        value={includedGuildIds}
        onValueChange={(guildId) =>
          onChange({
            excludedGuildIds: toggle(
              settings.excludedGuildIds.filter((id) =>
                guilds.some((guild) => guild.id === id),
              ),
              guildId,
            ),
          })
        }
        placeholder={t("statistics.feedLootlogs")}
        searchPlaceholder={t("statistics.feedLootlogsSearch")}
        emptyMessage={t("common.noResults")}
        width="w-full sm:w-[200px]"
        contentClassName="w-[200px]"
        disabled={disabled || guilds.length === 0}
        renderTriggerLabel={(count) =>
          count === guilds.length
            ? t("statistics.feedAllLootlogs")
            : t("statistics.feedSelectedLootlogs", {
                count,
                total: guilds.length,
              })
        }
      />
      <FilterPopover
        icon={Skull}
        multiSelect
        showSearch={false}
        options={ACTIVITY_FEED_NPC_CATEGORIES.map((category) => {
          const { color } = NPC_CATEGORY_APPEARANCE[category];

          return {
            value: category,
            label: categoryLabel(category),
            render: () => (
              <span className="flex items-center gap-2">
                <NpcTypeIcon type={category} className={cn("size-4", color)} />
                {categoryLabel(category)}
              </span>
            ),
          };
        })}
        value={includedCategories}
        onValueChange={(category) =>
          onChange({
            excludedNpcCategories: toggle(
              settings.excludedNpcCategories,
              category,
            ),
          })
        }
        placeholder={t("kills.filters.npcType")}
        width="w-full sm:w-[180px]"
        contentClassName="w-[180px]"
        disabled={disabled}
        renderTriggerLabel={(count) =>
          count === ACTIVITY_FEED_NPC_CATEGORIES.length
            ? t("kills.filters.allTypes")
            : t("statistics.feedSelectedTypes", {
                count,
                total: ACTIVITY_FEED_NPC_CATEGORIES.length,
              })
        }
      />
      <div className="flex h-10 items-center gap-2 px-1">
        <Switch
          id={lootOnlyId}
          checked={settings.withLootOnly}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ withLootOnly: checked })}
        />
        <Label htmlFor={lootOnlyId} className="text-sm font-normal">
          {t("statistics.feedWithLootOnly")}
        </Label>
      </div>
    </div>
  );
}
