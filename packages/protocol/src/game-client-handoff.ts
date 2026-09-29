import { Schema } from "effect";

/**
 * Message the web app's `/connect` popup posts to the Game client that opened
 * it, restricted to that Margonem origin. `state` echoes the value the Game
 * client put in the popup URL, so a page accepts only a handoff it asked for.
 */
export const GameClientHandoffMessage = Schema.Struct({
  type: Schema.Literal("lootlog:game-client-handoff"),
  state: Schema.String,
  code: Schema.String,
});

export type GameClientHandoffMessage = typeof GameClientHandoffMessage.Type;
