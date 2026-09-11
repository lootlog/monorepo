import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { useTimersStore } from "@/store/timers.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";

export const HiddenTimersTab = () => {
  const { generalConfig } = useTimersStore();

  const { data: guilds, isFetched } =
    useUsersControllerGetCurrentUserAccessibleGuilds();

  const [requestedGuildId, setRequestedGuildId] = useState("");
  const { t } = useTranslation();

  const requestedGuildExists = guilds?.some(
    (guild) => guild.id === requestedGuildId,
  );

  let selectedGuildId = "";

  if (!generalConfig.timersGrouping && isFetched) {
    selectedGuildId = requestedGuildExists
      ? requestedGuildId
      : (guilds?.[0]?.id ?? "");
  }

  return (
    <SettingsTabLayout>
      {!generalConfig.timersGrouping ? (
        <SettingsSection title={t("settings.hiddenTimers.scopeTitle")}>
          {guilds && guilds.length > 0 ? (
            <SettingsRow
              htmlFor="hidden-timers-guild"
              label={t("settings.hiddenTimers.guildLabel")}
              description={t("settings.hiddenTimers.ungroupedDescription")}
              control="wide"
            >
              <Select
                value={selectedGuildId}
                onValueChange={setRequestedGuildId}
              >
                <SelectTrigger id="hidden-timers-guild" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <span className="ll:inline-flex ll:min-w-0 ll:items-center ll:gap-1.5">
                        <Avatar className="ll:size-4 ll:shrink-0 ll:rounded-sm ll:bg-black/20">
                          <AvatarImage
                            src={guild.icon ?? undefined}
                            alt=""
                            className="ll:h-full ll:w-full ll:object-cover"
                          />
                          <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-black/20 ll:text-[9px] ll:font-semibold ll:text-foreground">
                            {guild.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="ll:truncate">{guild.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          ) : (
            <SettingsEmptyState>
              {t("settings.hiddenTimers.emptyGuilds")}
            </SettingsEmptyState>
          )}
        </SettingsSection>
      ) : null}
      <SettingsSection
        controlId="hidden-timers-list"
        title={t("settings.hiddenTimers.listTitle")}
      >
        <HiddenTimers guildId={selectedGuildId} />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
