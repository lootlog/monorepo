import { Schema } from "effect";
import { PlayerHit } from "./player-hit.js";

export const IndexPlayersPayload = Schema.Array(PlayerHit);

export type IndexPlayersCommand = {
  readonly players: typeof IndexPlayersPayload.Type;
};
