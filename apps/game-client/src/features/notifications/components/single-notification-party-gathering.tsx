import type { FC } from "react";
import type { PartyGatheringNotification } from "@/store/notifications.store";
import { useTranslation } from "react-i18next";

type SingleNotificationPartyGatheringProps = {
  notification: PartyGatheringNotification;
  meetsLevelReq: boolean;
};

export const SingleNotificationPartyGathering: FC<
  SingleNotificationPartyGatheringProps
> = ({ notification, meetsLevelReq }) => {
  const { t } = useTranslation("notifications");

  return (
    <>
      <div className="ll:flex ll:items-baseline ll:gap-1 ll:overflow-hidden ll:text-xs">
        <span className="ll:min-w-0 ll:truncate ll:font-semibold">
          {notification.character.nick}
        </span>
        <span className="ll:shrink-0">
          ({notification.character.lvl}
          {notification.character.prof})
        </span>
        {(notification.minLvl !== null || notification.maxLvl !== null) && (
          <span
            className={
              meetsLevelReq
                ? "ll:shrink-0 ll:text-[10px] ll:text-gray-300"
                : "ll:shrink-0 ll:text-[10px] ll:text-red-300"
            }
          >
            {t("content.levelRange", {
              min: notification.minLvl ?? 1,
              max: notification.maxLvl ?? 500,
            })}
          </span>
        )}
      </div>
      {notification.description && (
        <p className="ll:m-0 ll:text-[11px] ll:leading-4 ll:text-gray-200 ll:italic">
          {notification.description}
        </p>
      )}
    </>
  );
};
