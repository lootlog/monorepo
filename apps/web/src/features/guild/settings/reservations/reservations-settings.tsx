import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/api-client/react-query/main/guilds";
import { ReservationsSettingsForm } from "./reservations-settings-form";
import { ReservationsSettingsHeader } from "./reservations-header";

export const ReservationsSettings = () => {
  const guildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <ReservationsSettingsHeader />
      <ScrollArea className="flex-1 min-h-0 bg-background">
        {guild && <ReservationsSettingsForm guild={guild} />}
      </ScrollArea>
    </div>
  );
};
