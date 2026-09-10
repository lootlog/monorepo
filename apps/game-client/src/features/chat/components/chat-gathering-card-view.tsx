import type { ComponentProps, ReactNode } from "react";
import { ChatGatheringHeader } from "./chat-gathering-header";
import { ChatGatheringDetails } from "./chat-gathering-details";

type Props = {
  organizerDiscordId?: string;
  guildIds: readonly string[];
  details: ComponentProps<typeof ChatGatheringDetails>;
  control: ReactNode;
  counters: ReactNode;
  menu?: ReactNode;
  joined?: boolean;
};

export function ChatGatheringCardView({
  organizerDiscordId,
  guildIds,
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
          <div className="ll:min-w-0 ll:truncate">
            <ChatGatheringHeader
              organizerDiscordId={organizerDiscordId}
              guildIds={guildIds}
            />
          </div>
          <span className="ll:text-[#b7adbe]">{counters}</span>
        </div>
        <div className="ll:h-[24px] ll:w-[28px] ll:shrink-0 ll:mr-[-6px]">
          {menu}
        </div>
      </div>
      <div className="ll:mt-[-2px]">
        <ChatGatheringDetails {...details} showNpcIcon={false} />
      </div>
    </div>
  );
}
