import type { FC } from "react";
import type { PartyGatheringNotification } from "@/store/notifications.store";

type SingleNotificationPartyGatheringProps = {
  notification: PartyGatheringNotification;
  meetsLevelReq: boolean;
};

export const SingleNotificationPartyGathering: FC<
  SingleNotificationPartyGatheringProps
> = ({ notification, meetsLevelReq }) => {
  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col">
      <div className="ll:flex ll:gap-1 ll:overflow-hidden ll:text-xs">
        <span className="ll:min-w-0 ll:truncate ll:font-semibold">
          {notification.character.nick}
        </span>
        <span className="ll:shrink-0">
          ({notification.character.lvl}
          {notification.character.prof})
        </span>
        <span className="ll:shrink-0 ll:text-[10px] ll:font-semibold ll:text-purple-300">
          Szuka grupy
        </span>
      </div>
      {notification.description && (
        <p className="ll:text-[11px] ll:leading-4 ll:text-gray-200 ll:italic">
          "{notification.description}"
        </p>
      )}
      {(notification.minLvl !== null || notification.maxLvl !== null) && (
        <p
          className={
            meetsLevelReq
              ? "ll:text-[10px] ll:text-gray-300"
              : "ll:text-[10px] ll:text-red-300"
          }
        >
          Poziom: {notification.minLvl ?? 1} - {notification.maxLvl ?? 500}
        </p>
      )}
    </div>
  );
};
