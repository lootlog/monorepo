import type { GameEvent } from "@lootlog/margonem/game-events";
import { useFriendsStore } from "@/store/friends.store";
import { parseFriendsListFromEvent } from "@/utils/game/events/parse-friends-list-from-event";

export class FriendsProcessor {
  handle(event: GameEvent): void {
    if (event.friends === undefined && event.friends_max === undefined) {
      return;
    }

    useFriendsStore.getState().applyBatch({
      friends:
        event.friends === undefined
          ? undefined
          : parseFriendsListFromEvent(event.friends),
      friendsMax: event.friends_max,
    });
  }
}
