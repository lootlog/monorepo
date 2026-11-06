import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { PlayerName } from "@/components/player-name";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  selectNotificationGoing,
  useNotificationGoingStore,
} from "@/store/notification-going.store";

type NotificationGoingListProps = {
  notificationIds: readonly string[];
};

/**
 * Who of the player's Lootlogs said they are going to the reported NPC. The
 * row shows the count and as many nicks as fit; the tooltip lists everyone
 * with level, profession and clan.
 */
export function NotificationGoingList({
  notificationIds,
}: NotificationGoingListProps) {
  const { t } = useTranslation("notifications");

  const going = useNotificationGoingStore(
    useShallow((state) => selectNotificationGoing(state, notificationIds)),
  );

  if (going.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="ll:block ll:truncate ll:text-[11px] ll:text-green-300 ll:outline-none ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        >
          {t("going.list", {
            count: going.length,
            names: going.map((player) => player.nick).join(", "),
          })}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-0.5 ll:p-0">
          {going.map((player) => (
            <li key={player.discordId}>
              <PlayerName
                name={player.nick}
                level={player.lvl}
                profession={player.prof}
                clanName={player.clan?.name}
              />
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
