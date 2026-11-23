import { PlayerName } from "@/components/player-name";
import type { GatheringOrganizer } from "@/features/chat/party-gathering-organizer";

type Props = {
  organizer: GatheringOrganizer;
};

export function ChatGatheringHeader({ organizer }: Props) {
  return (
    <PlayerName
      className="ll:min-h-[18px] ll:text-xs ll:leading-[18px] ll:font-semibold ll:text-foreground"
      name={organizer.nick}
      level={organizer.lvl}
      profession={organizer.prof}
    />
  );
}
