import { createFileRoute } from "@tanstack/react-router";
import { NpcSettingsDetailPage } from "@/features/guild/settings/npcs/npc-settings-detail-page";
import { NpcSettingsDetailSkeleton } from "@/features/guild/settings/npcs/npc-settings-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/npcs_/$npcId",
)({
  staticData: {
    navigation: ({ t, match, parentPath, currentEntityLabel }) => ({
      ancestors: [
        {
          label: t("common.breadcrumbs.settingsNpcs"),
          path: `${parentPath}/npcs`,
        },
      ],
      label:
        currentEntityLabel ??
        t("common.breadcrumbs.npcFallback", { id: match.params?.npcId }),
    }),
  },
  component: NpcSettingsDetailPage,
  pendingComponent: NpcSettingsDetailSkeleton,
});
