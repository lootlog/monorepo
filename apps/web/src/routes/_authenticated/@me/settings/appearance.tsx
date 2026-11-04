import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

import { Schema } from "effect";
import { optionalOrUndefined } from "@lootlog/schema/stored-value";

const decodeAppearanceSearch = Schema.decodeUnknownSync(
  Schema.Struct({ theme: optionalOrUndefined(Schema.String) }),
);

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    staticData: {
      navigation: ({ t }) => ({
        label: t("settings.appearance.title"),
        tab: true,
      }),
    },
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
    validateSearch: decodeAppearanceSearch,
  },
);
