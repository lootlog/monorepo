import { Option, Schema } from "effect";
import type { AppNavigationMatch } from "@/navigation/app-navigation";

const decodeBingoBoardLoaderData = Schema.decodeUnknownOption(
  Schema.Struct({
    board: Schema.optional(
      Schema.Struct({ name: Schema.optional(Schema.String) }),
    ),
  }),
);

export const getBingoBoardName = (match: AppNavigationMatch) =>
  Option.getOrUndefined(decodeBingoBoardLoaderData(match.loaderData))?.board
    ?.name;
