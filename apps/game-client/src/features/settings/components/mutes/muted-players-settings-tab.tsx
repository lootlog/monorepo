import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { matchesMuteSearch } from "@/features/settings/components/mutes/mutes-search";
import {
  useCurrentUserNotificationMutes,
  useUpdateNotificationMutes,
} from "@/features/settings/persistence/use-notification-mutes";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const MutedPlayersSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const updateNotificationMutes = useUpdateNotificationMutes();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const isActionsDisabled = !isReady || updateNotificationMutes.isPending;

  const players = mutes.players
    .map((player) => ({
      ...player,
      name: player.displayName || t("settings.mutes.unknownPlayer"),
    }))
    .filter((player) => matchesMuteSearch(search, [player.name]))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  return (
    <SettingsTabLayout>
      <search className="ll:flex">
        <SearchInput
          value={search}
          placeholder={t("settings.mutes.playersSearchPlaceholder")}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          clearLabel={t("settings.search.clear")}
        />
      </search>
      <SettingsSection
        controlId="muted-players"
        title={t("settings.mutes.playersTitle", {
          count: mutes.players.length,
        })}
        description={t("settings.mutes.playersDescription")}
      >
        {players.length === 0 ? (
          <SettingsEmptyState>
            {mutes.players.length === 0
              ? t("settings.mutes.noPlayers")
              : t("settings.mutes.noPlayerResults")}
          </SettingsEmptyState>
        ) : (
          <SettingsList>
            {players.map((player) => (
              <SettingsListRow
                key={player.discordId}
                leading={
                  <Avatar className="ll:size-6 ll:rounded-sm ll:border ll:border-white/10 ll:bg-black/20">
                    <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                }
                title={player.name}
              >
                <SettingsIconButton
                  variant="destructive"
                  label={t("settings.mutes.removeLabel", { name: player.name })}
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
                  <Trash2 />
                </SettingsIconButton>
              </SettingsListRow>
            ))}
          </SettingsList>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
