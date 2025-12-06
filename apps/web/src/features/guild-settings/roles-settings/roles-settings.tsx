import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildRoles,
  type GuildRole,
} from "@/hooks/api/guilds/use-guild-roles";
import { useState } from "react";
import { Shield } from "lucide-react";
import { Permission } from "@lootlog/types";
import { RolePanelContent } from "@/features/guild-settings/roles-settings/components/roles-panel";
import { RoleListItem } from "@/features/guild-settings/roles-settings/components/role-list-item";
import {
  SelectorPanel,
  SelectorPanelProvider,
  useSelectorPanel,
} from "@/components/selector-panel";

const RolesSettingsHeader = () => (
  <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2 rounded-lg bg-primary/10">
        <Shield className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">Ustawienia ról</h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Zarządzaj uprawnieniami dla ról Discord
        </p>
      </div>
    </div>
  </div>
);

const RolesSettingsContent = () => {
  const { data: roles } = useGuildRoles();
  const [searchValue, setSearchValue] = useState("");
  const { selectedItem: selectedRole } = useSelectorPanel<GuildRole>();

  const filteredRoles = roles
    ?.filter((role) => {
      return role.name.toLowerCase().includes(searchValue.toLowerCase());
    })
    .sort((a, b) => {
      const aIsAdmin = a.permissions.includes(Permission.ADMIN);
      const bIsAdmin = b.permissions.includes(Permission.ADMIN);
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      const aPosition = a.position ?? 0;
      const bPosition = b.position ?? 0;
      if (aPosition !== bPosition) return bPosition - aPosition;

      return a.name.localeCompare(b.name);
    });

  const selectedRoleColor =
    selectedRole?.color === 0
      ? "FFF"
      : selectedRole?.color.toString(16).padStart(6, "0");

  return (
    <SelectorPanel<GuildRole>
      header={<RolesSettingsHeader />}
      searchBar={
        <div className="px-3 py-2 border-b shrink-0 bg-background">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Szukaj roli..."
            className="h-9"
          />
        </div>
      }
      listContent={
        <>
          {filteredRoles?.map((role, index) => (
            <RoleListItem key={role.id} role={role} index={index} />
          ))}
        </>
      }
      panelContent={
        selectedRole && (
          <RolePanelContent selectedRoleColor={selectedRoleColor} />
        )
      }
      emptyState={
        filteredRoles?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Shield className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Nie znaleziono ról</p>
            <p className="text-xs mt-1">
              Spróbuj zmienić kryteria wyszukiwania
            </p>
          </div>
        )
      }
      mobileDrawerTitle={(role) => (
        <>
          <div
            className="size-4 rounded-full"
            style={{
              backgroundColor: `#${role.color === 0 ? "FFF" : role.color.toString(16).padStart(6, "0")}`,
            }}
          />
          <span>{role.name}</span>
        </>
      )}
    />
  );
};

export const RolesSettings = () => {
  return (
    <SelectorPanelProvider<GuildRole>>
      <RolesSettingsContent />
    </SelectorPanelProvider>
  );
};
