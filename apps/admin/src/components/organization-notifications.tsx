import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { text } from "@/lib/messages";

export function OrganizationNotifications({
  notifications,
}: {
  notifications: AdminOrganizationDetails["notifications"];
}) {
  const counts = [
    { label: text.notificationsPending, value: notifications.pending },
    { label: text.notificationsFailed, value: notifications.failed },
    { label: text.notificationsBlocked, value: notifications.blocked },
  ];

  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {counts.map((count) => (
        <div key={count.label} className="grid">
          <dt className="text-xs text-muted-foreground">{count.label}</dt>
          <dd className="tabular-nums">{count.value}</dd>
        </div>
      ))}
      {notifications.lastError === null ? null : (
        <div className="grid min-w-0 sm:col-span-3">
          <dt className="text-xs text-muted-foreground">
            {text.notificationsLastError}
          </dt>
          <dd className="break-words">{notifications.lastError}</dd>
        </div>
      )}
    </dl>
  );
}
