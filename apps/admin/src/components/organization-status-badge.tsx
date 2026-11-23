import type { AdminOrganizationStatus } from "@lootlog/schema/admin-organizations";
import { Badge } from "@lootlog/ui/components/badge";
import { organizationStatusText } from "@/lib/messages";

const variant = {
  active: "ready",
  suspended: "destructive",
  inactive: "secondary",
} as const;

export function OrganizationStatusBadge({
  status,
}: {
  status: AdminOrganizationStatus;
}) {
  return (
    <Badge variant={variant[status]}>{organizationStatusText[status]}</Badge>
  );
}
