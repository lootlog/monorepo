import { PlayerName } from "@/components/player-name";
import type { GatheringOrganizer } from "@/features/chat/party-gathering-organizer";

type Props = {
  organizer: GatheringOrganizer;
};

/** The organizer's character; the clan has a line of its own below. */
export function ChatGatheringHeader({ organizer }: Props) {
  return (
    <PlayerName
      className="ll:min-h-[18px] ll:text-[12px] ll:leading-[18px] ll:font-semibold ll:text-white"
      name={organizer.nick}
      level={organizer.lvl}
      profession={organizer.prof}
    />
  );
}
