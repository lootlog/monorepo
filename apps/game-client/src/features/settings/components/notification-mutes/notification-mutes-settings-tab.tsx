import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  useCurrentUserNotificationMutes,
  useUpdateNotificationMutes,
} from "@/features/settings/persistence/use-notification-mutes";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const NotificationMutesSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const updateNotificationMutes = useUpdateNotificationMutes();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const isActionsDisabled = !isReady || updateNotificationMutes.isPending;

  const normalizedSearch = search.trim().toLocaleLowerCase("pl");

  const matchesSearch = (values: string[]) =>
    !normalizedSearch ||
    values.some((value) =>
      value.toLocaleLowerCase("pl").includes(normalizedSearch),
    );

  const sortedPlayers = mutes.players
    .filter((player) => matchesSearch([player.displayName, player.discordId]))
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, "pl"),
    );

  const sortedNpcs = mutes.npcs
    .filter((npc) =>
      matchesSearch([npc.name, npc.npcType, npc.prof ?? "", String(npc.lvl)]),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  return (
    <SettingsTabLayout
      actions=<SearchInput
        value={search}
        placeholder={t("settings.notificationMutes.searchPlaceholder")}
        onChange={(event) => setSearch(event.target.value)}
      />
    >
      <SettingsSection
        controlId="notification-mutes"
        title={t("settings.notificationMutes.playersTitle", {
          count: mutes.players.length,
        })}
        description={t("settings.notificationMutes.playersDescription")}
      >
        {sortedPlayers.length === 0 ? (
          <SettingsEmptyState>
            {t("settings.notificationMutes.emptyPlayers")}
          </SettingsEmptyState>
        ) : (
          <SettingsList>
            {sortedPlayers.map((player) => {
              const name =
                player.displayName ||
                t("settings.notificationMutes.unknownPlayer");

              return (
                <SettingsListRow
                  key={player.discordId}
                  leading={
                    <Avatar className="ll:size-6 ll:rounded-sm ll:border ll:border-white/10 ll:bg-black/20">
                      <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  }
                  title={name}
                  description={player.discordId}
                >
                  <Button
                    variant="ghost"
                    className="ll:px-2"
                    disabled={isActionsDisabled}
                    onClick={() =>
                      updateNotificationMutes.mutate({
                        players: mutes.players.filter(
                          (currentPlayer) =>
                            currentPlayer.discordId !== player.discordId,
                        ),
                      })
                    }
                  >
                    {t("common:actions.remove")}
                  </Button>
                </SettingsListRow>
              );
            })}
          </SettingsList>
        )}
      </SettingsSection>

      <SettingsSection
        title={t("settings.notificationMutes.npcsTitle", {
          count: mutes.npcs.length,
        })}
        description={t("settings.notificationMutes.npcsDescription")}
      >
        {sortedNpcs.length === 0 ? (
          <SettingsEmptyState>
            {t("settings.notificationMutes.emptyNpcs")}
          </SettingsEmptyState>
        ) : (
          <SettingsList>
            {sortedNpcs.map((npc) => (
              <SettingsListRow
                key={npc.npcKey}
                leading={
                  npc.icon ? (
                    <img
                      src={npc.icon}
                      alt=""
                      className="ll:size-6 ll:rounded-sm ll:border ll:border-white/10 ll:bg-black/20 ll:object-contain"
                    />
                  ) : undefined
                }
                title={npc.name}
                description={[
                  npc.npcType,
                  t("settings.notificationMutes.npcLevel", { level: npc.lvl }),
                  npc.prof,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <Button
                  variant="ghost"
                  className="ll:px-2"
                  disabled={isActionsDisabled}
                  onClick={() =>
                    updateNotificationMutes.mutate({
                      npcs: mutes.npcs.filter(
                        (currentNpc) => currentNpc.npcKey !== npc.npcKey,
                      ),
                    })
                  }
                >
                  {t("common:actions.remove")}
                </Button>
              </SettingsListRow>
            ))}
          </SettingsList>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
