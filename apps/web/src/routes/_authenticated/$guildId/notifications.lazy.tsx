import { Outlet, createLazyFileRoute } from "@tanstack/react-router";

const GuildNotificationsLayout = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
};

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications",
)({
  component: GuildNotificationsLayout,
});
