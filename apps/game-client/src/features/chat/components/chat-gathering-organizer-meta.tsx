import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatGatheringOrganizerMember } from "./chat-gathering-organizer-member";

type Props = {
  clanName?: string;
  mapName?: string;
  organizerDiscordId?: string;
  guildIds: readonly string[];
};

/**
 * The organizer's clan, the map they stand on and their Lootlog name, on a
 * line of its own so a narrow chat never drops the clan to fit the nick.
 */
export function ChatGatheringOrganizerMeta({
  clanName,
  mapName,
  organizerDiscordId,
  guildIds,
}: Props) {
  const { t } = useTranslation("chat");

  return (
    <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5 ll:text-[10px] ll:leading-[14px] ll:text-muted-foreground">
      {clanName ? (
        <span className="ll:min-w-0 ll:max-w-[45%] ll:shrink-0 ll:truncate ll:text-white/75">
          {clanName}
        </span>
      ) : null}
      {mapName ? (
        <span
          className="ll:flex ll:min-w-0 ll:items-center ll:gap-0.5"
          title={t("gatherings.organizerMap", { map: mapName })}
        >
          <MapPin aria-hidden="true" className="ll:size-2.5 ll:shrink-0" />
          <span className="ll:sr-only">
            {t("gatherings.organizerMap", { map: mapName })}
          </span>
          <span aria-hidden="true" className="ll:truncate">
            {mapName}
          </span>
        </span>
      ) : null}
      <ChatGatheringOrganizerMember
        organizerDiscordId={organizerDiscordId}
        guildIds={guildIds}
      />
    </div>
  );
}
