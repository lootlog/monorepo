import type { ComponentProps, ReactNode } from "react";
import { ReadyRoomMinutesLeft } from "@/components/common/ready-room-minutes-left";
import { ChatGatheringHeader } from "./chat-gathering-header";
import { ChatGatheringDetails } from "./chat-gathering-details";
import { ChatGatheringOrganizerMeta } from "./chat-gathering-organizer-meta";
import type { GatheringOrganizer } from "@/features/chat/party-gathering-organizer";

type Props = {
  organizer: GatheringOrganizer;
  organizerDiscordId?: string;
  organizerMapName?: string;
  guildIds: readonly string[];
  expiresAt: string;
  details: ComponentProps<typeof ChatGatheringDetails>;
  control: ReactNode;
  counters: ReactNode;
  menu?: ReactNode;
  joined?: boolean;
};

/**
 * One gathering in the chat: the organizer's character first, what the
 * gathering is for, then the organizer's clan, map and Lootlog name.
 */
export function ChatGatheringCardView({
  organizer,
  organizerDiscordId,
  organizerMapName,
  guildIds,
  expiresAt,
  details,
  control,
  counters,
  menu,
  joined = false,
}: Props) {
  return (
    <div
      className="ll-party-gathering-card ll:relative ll:flex ll:min-w-0 ll:flex-col ll:gap-0 ll:px-[8px] ll:pt-[2px] ll:pb-[4px]"
      data-joined={joined}
    >
      {control}
      <div className="ll:flex ll:min-h-[24px] ll:items-center ll:gap-1">
        <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1.5">
          <ChatGatheringHeader organizer={organizer} />
          <span className="ll:shrink-0 ll:text-[#b7adbe]">{counters}</span>
          <ReadyRoomMinutesLeft expiresAt={expiresAt} />
        </div>
        <div className="ll:h-[24px] ll:w-[28px] ll:shrink-0 ll:mr-[-6px]">
          {menu}
        </div>
      </div>
      <div className="ll:mt-[-2px]">
        <ChatGatheringDetails {...details} />
      </div>
      <ChatGatheringOrganizerMeta
        clanName={organizer.clanName}
        mapName={organizerMapName}
        organizerDiscordId={organizerDiscordId}
        guildIds={guildIds}
      />
    </div>
  );
}
