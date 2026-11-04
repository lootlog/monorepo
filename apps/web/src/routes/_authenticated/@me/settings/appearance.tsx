import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

import { Schema } from "effect";
import { optionalWithFallback } from "@/lib/lenient-schema";

const decodeAppearanceSearch = Schema.decodeUnknownSync(
  Schema.Struct({ theme: optionalWithFallback(Schema.String) }),
);

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
    validateSearch: decodeAppearanceSearch,
  },
);
