import { Outlet, createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/notifications",
)({
  component: () => (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  ),
});
