import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { text } from "@/lib/messages";

export function OrganizationRoles({
  roles,
}: {
  roles: AdminOrganizationDetails["roles"];
}) {
  if (roles.length === 0)
    return <p className="text-sm text-muted-foreground">{text.rolesEmpty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.roleName}</TableHead>
          <TableHead>{text.rolePermissions}</TableHead>
          <TableHead className="hidden md:table-cell">
            {text.roleLevels}
          </TableHead>
          <TableHead className="text-right">{text.roleMembers}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="whitespace-normal font-medium">
              {role.name}
            </TableCell>
            <TableCell className="whitespace-normal">
              {role.permissions.length === 0 ? (
                <span className="text-muted-foreground">
                  {text.noPermissions}
                </span>
              ) : (
                <details className="group">
                  <summary className="w-fit cursor-pointer rounded-control text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {text.permissionsCount(role.permissions.length)}
                  </summary>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary">
                        {permission}
                      </Badge>
                    ))}
                  </span>
                </details>
              )}
            </TableCell>
            <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
              {role.levelFrom ?? 0}–{role.levelTo ?? 500}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {role.members}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
