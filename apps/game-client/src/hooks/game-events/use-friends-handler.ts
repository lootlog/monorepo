import { useEffectEvent } from "react";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useFriendsStore } from "@/store/friends.store";
import { parseFriendsListFromEvent } from "@/utils/game/events/parse-friends-list-from-event";

export const useFriendsHandler = () => {
  const setFriends = useFriendsStore((s) => s.setFriends);
  const setFriendsMax = useFriendsStore((s) => s.setFriendsMax);

  const handleFriendsEvent = useEffectEvent((event: GameEvent) => {
    if (event.friends !== undefined) {
      const friends = parseFriendsListFromEvent(event.friends);
      setFriends(friends);
    }

    if (event.friends_max !== undefined) {
      setFriendsMax(event.friends_max);
    }
  });

  const fetchFriends = useEffectEvent(() => {
    window._g("friends&a=show");
  });

  return { handleFriendsEvent, fetchFriends };
};
