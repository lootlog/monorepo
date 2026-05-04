import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { RolesForm } from "@/features/guild/settings/roles/components/roles-form";
import { ArrowLeft } from "lucide-react";
import type { FC } from "react";
import { Permission } from "@lootlog/types";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { useSelectorPanel } from "@/components/selector-panel";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@/lib/api/generated/main/roles/roles";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";

export type RolePanelContentProps = {
  selectedRoleColor: string | undefined;
};

export const RolePanelContent: FC<RolePanelContentProps> = ({
  selectedRoleColor,
}) => {
  const guildId = useGuildId();
  const { data: roles } = useRolesControllerGetGuildRoles({
    guildId: guildId ?? "",
  });
  const {
    selectedItem: selectedRole,
    setSelectedItem: setSelectedRole,
    isMobileDrawerOpen,
  } = useSelectorPanel<GuildRole>();

  if (!selectedRole) return null;
  const currentRole =
    roles?.find((r) => r.id === selectedRole.id) ?? selectedRole;

  const hasAdminPermission = currentRole.permissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) =>
          currentRole.permissions.includes(perm),
        ),
      );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {!isMobileDrawerOpen && (
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-2">
          <button
            type="button"
            onClick={() => setSelectedRole(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors mr-3"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `#${selectedRoleColor}20` }}
            >
              <div
                className="size-4 rounded-full"
                style={{ backgroundColor: `#${selectedRoleColor}` }}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight truncate">
                {currentRole.name}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                Poziom {currentRole.lvlRangeFrom} - {currentRole.lvlRangeTo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <TooltipProvider delayDuration={100}>
              {activeCategories.map((category) => {
                const activePerms = category.permissions.filter((perm) =>
                  currentRole.permissions.includes(perm),
                );

                return (
                  <PermissionCategoryTooltip
                    key={category.name}
                    category={category}
                    activePermissions={activePerms}
                    side="bottom"
                  />
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <RolesForm role={selectedRole} />
      </ScrollArea>
    </div>
  );
};
