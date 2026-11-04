import { createFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { Init } from "@/features/init/init";
import { Schema } from "effect";
import { optionalOrUndefined } from "@lootlog/schema/stored-value";

const decodeInitSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    guild_id: optionalOrUndefined(Schema.Trim.check(Schema.isNonEmpty())),
  }),
);

export const Route = createFileRoute("/init")({
  component: Init,
  pendingComponent: FullScreenLoading,
  validateSearch: decodeInitSearch,
});
