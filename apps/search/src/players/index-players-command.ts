import type { SearchPlayer } from "@lootlog/protocol/rabbit/events";

export type IndexPlayersCommand = {
  readonly players: ReadonlyArray<SearchPlayer>;
};
