import { loadGuildSettings } from "@/lib/router/guild-settings-loader";
import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSettings } from "@/features/guild/settings/reservations/reservations-settings";
import { ReservationsSettingsSkeleton } from "@/features/guild/settings/reservations/reservations-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/reservations",
)({
  loader: loadGuildSettings,
  component: ReservationsSettings,
  pendingComponent: ReservationsSettingsSkeleton,
});
