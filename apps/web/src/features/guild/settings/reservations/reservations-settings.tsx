import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { ReservationsSettingsForm } from "./reservations-settings-form";
import { ReservationSharingSettings } from "./reservation-sharing-settings";

export const ReservationsSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <SettingsTabPage title={t("settings.guildNavigation.reservations")}>
      {/* Room below the last section for the docked save bar. */}
      <div className="pb-24">
        {guild && <ReservationsSettingsForm guild={guild} />}
        <ReservationSharingSettings />
      </div>
    </SettingsTabPage>
  );
};
