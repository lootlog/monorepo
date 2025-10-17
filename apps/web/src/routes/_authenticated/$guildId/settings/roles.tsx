import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/roles-settings/roles-settings";

export const Route = createFileRoute("/_authenticated/$guildId/settings/roles")(
  {
    component: RolesSettings,
  }
);
