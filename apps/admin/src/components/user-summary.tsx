import type { AdminUser } from "@lootlog/client/auth";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";

/** Who the User is: name, identifiers, roles and standing. */
export function UserSummary({ user }: { user: AdminUser }) {
  const facts = [
    { label: text.userId, value: user.id },
    { label: text.discordId, value: user.discordId },
    { label: text.email, value: user.email },
    { label: text.joined, value: formatDateTime(user.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar name={user.name} image={user.image} />
        <h1 className="min-w-0 break-words text-xl font-semibold">
          {user.name}
        </h1>
        <StatusBadge banned={user.ban !== null} />
        <RoleBadges roles={user.roles} />
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="grid min-w-0">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="break-all">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
