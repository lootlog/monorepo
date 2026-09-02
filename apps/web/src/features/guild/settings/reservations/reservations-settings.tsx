import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { ReservationsSettingsForm } from "./reservations-settings-form";
import { ReservationSharingSettings } from "./reservation-sharing-settings";

export const ReservationsSettings = () => {
  const guildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1 bg-background">
        <div className="w-full space-y-4 px-3 pb-24">
          {guild && <ReservationsSettingsForm guild={guild} />}
          <ReservationSharingSettings />
        </div>
      </ScrollArea>
    </div>
  );
};
