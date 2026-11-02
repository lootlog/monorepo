import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MutedListTab } from "@/features/settings/components/mutes/muted-list-tab";
import {
  useCurrentUserNotificationMutes,
  useUpdateNotificationMutes,
} from "@/features/settings/persistence/use-notification-mutes";
import { useTranslation } from "react-i18next";

export const MutedPlayersSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const { mutateFromCurrent } = useUpdateNotificationMutes();
  const { t } = useTranslation();

  const players = mutes.players.map((player) => ({
    ...player,
    name: player.displayName || t("settings.mutes.unknownPlayer"),
  }));

  return (
    <MutedListTab
      controlId="muted-players"
      title={t("settings.mutes.playersTitle", { count: players.length })}
      searchPlaceholder={t("settings.mutes.playersSearchPlaceholder")}
      emptyLabel={t("settings.mutes.noPlayers")}
      noResultsLabel={t("settings.mutes.noPlayerResults")}
      isReady={isReady}
      items={players}
      getKey={(player) => player.discordId}
      getName={(player) => player.name}
      getSearchValues={(player) => [player.name]}
      renderLeading={(player) => (
        <Avatar className="ll:size-6 ll:rounded-sm ll:bg-black/20">
          <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:text-[11px] ll:font-semibold">
            {player.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      onRemove={(player) =>
        mutateFromCurrent((current) => ({
          players: current.players.filter(
            (currentPlayer) => currentPlayer.discordId !== player.discordId,
          ),
        }))
      }
    />
  );
};
