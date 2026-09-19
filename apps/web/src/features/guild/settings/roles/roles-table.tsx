import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getSettingsRowLinkProps } from "@/features/guild/settings/components/settings-row-link-props";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { Table } from "@lootlog/ui/components/table";
import { useNavigate } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { useRolesTableColumns } from "./use-roles-table-columns";

type RolesTableProps = {
  guildId: string;
  isMobile: boolean;
  roles: GuildRole[];
};

const getRolesTableCellClassName = (columnId: string) => {
  if (columnId === "role") {
    return "min-w-0 overflow-hidden";
  }

  if (columnId === "levelRange") {
    return "overflow-hidden text-xs text-muted-foreground";
  }

  if (columnId === "permissions") {
    return "overflow-hidden";
  }

  return "text-right";
};

export const RolesTable = ({ guildId, isMobile, roles }: RolesTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openRoleDetails = (role: GuildRole) => {
    navigate({
      to: "/$guildId/settings/roles/$roleId",
      params: { guildId, roleId: role.id },
    });
  };

  const columns = useRolesTableColumns({ guildId, openRoleDetails });

  const table = useTable({
    features: coreTableFeatures,
    data: roles,
    columns,
    getRowId: (role) => role.id,
  });

  if (isMobile) {
    return (
      <div className="divide-y divide-border">
        {roles.map((role) => {
          const color = getColorFromRoleColor(role.color);

          return (
            <button
              key={role.id}
              type="button"
              className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => openRoleDetails(role)}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: `#${color}` }}
              />
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-semibold"
                  style={{ color: `#${color}` }}
                >
                  {role.name}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {t("settings.roles.levelRange", {
                    from: role.lvlRangeFrom,
                    to: role.lvlRangeTo,
                  })}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {t("settings.roles.permissionCountCompact", {
                  count: role.permissions.length,
                })}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Table className="min-w-[820px] table-fixed">
      <colgroup>
        <col className="w-[300px]" />
        <col className="w-[180px]" />
        <col />
        <col className="w-16" />
      </colgroup>
      <TanStackTableHeader
        table={table}
        className="sticky top-0 z-10 bg-background"
        rowClassName="border-b-1! border-border"
        getHeadClassName={(header) =>
          header.column.id === "actions" ? "text-right" : ""
        }
      />
      <TanStackTableBody
        table={table}
        getRowClassName={(row) =>
          cn(
            "relative h-14 cursor-pointer border-b border-border transition-colors hover:bg-accent/35",
            row.index === roles.length - 1 && "border-b-0",
          )
        }
        getCellClassName={(cell) => getRolesTableCellClassName(cell.column.id)}
        getRowProps={(row) =>
          getSettingsRowLinkProps(() => openRoleDetails(row.original))
        }
      />
    </Table>
  );
};
