import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const NotificationMutesSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const updateUserPreferences = useUpdateUserPreferences();
  const [playerSearch, setPlayerSearch] = useState("");
  const [npcSearch, setNpcSearch] = useState("");
  const { t } = useTranslation();
  const isMutating = updateUserPreferences.isPending;
  const isActionsDisabled = !isReady || isMutating;

  const normalizedPlayerSearch = playerSearch.trim().toLocaleLowerCase("pl");
  const normalizedNpcSearch = npcSearch.trim().toLocaleLowerCase("pl");

  const sortedPlayers = [...mutes.players]
    .filter((player) => {
      if (!normalizedPlayerSearch) {
        return true;
      }

      return [player.displayName, player.discordId].some((value) =>
        value.toLocaleLowerCase("pl").includes(normalizedPlayerSearch),
      );
    })
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, "pl"),
    );
  const sortedNpcs = [...mutes.npcs]
    .filter((npc) => {
      if (!normalizedNpcSearch) {
        return true;
      }

      return [npc.name, npc.npcType, npc.prof ?? "", String(npc.lvl)].some(
        (value) => value.toLocaleLowerCase("pl").includes(normalizedNpcSearch),
      );
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  return (
    <SettingsTabLayout
      title={t("settings.notificationMutes.title")}
      description={t("settings.notificationMutes.description")}
      contentClassName="ll:gap-3"
    >
      <Tabs defaultValue="players" className="ll:w-full ll:gap-3">
        <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
          <TabsTrigger
            value="players"
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {t("settings.notificationMutes.tabs.players")}
          </TabsTrigger>
          <TabsTrigger
            value="npcs"
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {t("settings.notificationMutes.tabs.npcs")}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="players"
          className={`${SETTINGS_SUBTAB_CONTENT_CLASS_NAME} ll:space-y-3`}
        >
          <Input
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder={t(
              "settings.notificationMutes.searchPlayersPlaceholder",
            )}
            className="ll:h-8 ll:text-[12px]"
          />
          <div className="ll:space-y-2">
            {sortedPlayers.length === 0 ? (
              <SettingsEmptyState>
                {t("settings.notificationMutes.emptyPlayers")}
              </SettingsEmptyState>
            ) : (
              sortedPlayers.map((player) => (
                <SettingsPanel
                  key={player.discordId}
                  className="ll:flex ll:items-center ll:justify-between ll:gap-3"
                >
                  <div className="ll:min-w-0 ll:flex-1 ll:flex ll:flex-col">
                    <span className="ll:text-[12px] ll:font-semibold ll:text-white ll:truncate">
                      {player.displayName ||
                        t("settings.notificationMutes.unknownPlayer")}
                    </span>
                    <span className="ll:text-[11px] ll:text-gray-400 ll:truncate">
                      {player.discordId}
                    </span>
                  </div>
                  <Button
                    className="ll:h-7 ll:px-2.5 ll:text-[11px] ll:font-semibold"
                    disabled={isActionsDisabled}
                    onClick={() =>
                      updateUserPreferences.mutate({
                        mutes: {
                          players: mutes.players.filter(
                            (currentPlayer) =>
                              currentPlayer.discordId !== player.discordId,
                          ),
                        },
                      })
                    }
                  >
                    {t("common:actions.remove")}
                  </Button>
                </SettingsPanel>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="npcs"
          className={`${SETTINGS_SUBTAB_CONTENT_CLASS_NAME} ll:space-y-3`}
        >
          <Input
            value={npcSearch}
            onChange={(event) => setNpcSearch(event.target.value)}
            placeholder={t("settings.notificationMutes.searchNpcsPlaceholder")}
            className="ll:h-8 ll:text-[12px]"
          />
          <div className="ll:space-y-2">
            {sortedNpcs.length === 0 ? (
              <SettingsEmptyState>
                {t("settings.notificationMutes.emptyNpcs")}
              </SettingsEmptyState>
            ) : (
              sortedNpcs.map((npc) => (
                <SettingsPanel
                  key={npc.npcKey}
                  className="ll:flex ll:items-center ll:justify-between ll:gap-3"
                >
                  <div className="ll:min-w-0 ll:flex ll:flex-1 ll:items-center ll:gap-3">
                    {npc.icon ? (
                      <img
                        src={npc.icon}
                        alt={npc.name}
                        className="ll:size-8 ll:shrink-0 ll:rounded-sm ll:border ll:border-gray-600 ll:bg-black/30 ll:object-contain"
                      />
                    ) : null}
                    <div className="ll:min-w-0 ll:flex ll:flex-col">
                      <span className="ll:text-[12px] ll:font-semibold ll:text-white ll:truncate">
                        {npc.name}
                      </span>
                      <span className="ll:text-[11px] ll:text-gray-400 ll:truncate">
                        {npc.npcType} •{" "}
                        {t("settings.notificationMutes.npcLevel", {
                          level: npc.lvl,
                        })}
                        {npc.prof ? ` • ${npc.prof}` : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="ll:h-7 ll:px-2.5 ll:text-[11px] ll:font-semibold"
                    disabled={isActionsDisabled}
                    onClick={() =>
                      updateUserPreferences.mutate({
                        mutes: {
                          npcs: mutes.npcs.filter(
                            (currentNpc) => currentNpc.npcKey !== npc.npcKey,
                          ),
                        },
                      })
                    }
                  >
                    {t("common:actions.remove")}
                  </Button>
                </SettingsPanel>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </SettingsTabLayout>
  );
};
