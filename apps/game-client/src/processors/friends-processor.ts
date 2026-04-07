import type { GameEvent } from "@lootlog/margonem/game-events";
import { useFriendsStore } from "@/store/friends.store";
import { parseFriendsListFromEvent } from "@/utils/game/events/parse-friends-list-from-event";

export class FriendsProcessor {
  handle(event: GameEvent): void {
    if (event.friends !== undefined) {
      const friends = parseFriendsListFromEvent(event.friends);
      useFriendsStore.getState().setFriends(friends);
    }

    if (event.friends_max !== undefined) {
      useFriendsStore.getState().setFriendsMax(event.friends_max);
    }
  }

  fetchFriends(): void {
    window._g("friends&a=show");
  }
}
