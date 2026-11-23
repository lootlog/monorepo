import type { AdminUser } from "@lootlog/schema/admin";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { FactList } from "@/components/fact-list";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";

export function UserSummary({ user }: { user: AdminUser }) {
  return (
    <PageHeader
      media={
        <UserAvatar name={user.name} image={user.image} className="size-9" />
      }
      title={user.name}
      status={
        <>
          <StatusBadge banned={user.ban !== null} />
          <RoleBadges roles={user.roles} />
        </>
      }
    >
      <FactList
        facts={[
          { label: text.userId, value: user.id },
          { label: text.discordId, value: user.discordId },
          { label: text.email, value: user.email },
          { label: text.joined, value: formatDateTime(user.createdAt) },
        ]}
      />
    </PageHeader>
  );
}
