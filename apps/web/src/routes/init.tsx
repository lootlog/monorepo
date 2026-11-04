import { createFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { Init } from "@/features/init/init";
import { Schema } from "effect";
import { optionalWithFallback } from "@/lib/lenient-schema";

const decodeInitSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    guild_id: optionalWithFallback(Schema.Trim.check(Schema.isNonEmpty())),
  }),
);

export const Route = createFileRoute("/init")({
  component: Init,
  pendingComponent: FullScreenLoading,
  validateSearch: decodeInitSearch,
});
