import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildRoles,
  type GuildRole,
} from "@/hooks/api/guilds/use-guild-roles";
import { useState } from "react";
import { Shield } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Permission } from "@lootlog/types";
import { colorIntToHex } from "@/utils/color-to-hex";
import { RolePanelContent } from "@/features/guild-settings/roles-settings/components/roles-panel";
import { RoleListItem } from "@/features/guild-settings/roles-settings/components/role-list-item";
import {
  SelectorPanel,
  SelectorPanelProvider,
  useSelectorPanel,
} from "@/components/selector-panel";

const RolesSettingsHeader = () => (
  <Card className="mx-3 mt-3 gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
        <Shield className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold leading-tight">
          Ustawienia ról
        </h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Zarządzaj uprawnieniami dla ról Discord
        </p>
      </div>
    </div>
  </Card>
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

  const selectedRoleColor = selectedRole
    ? colorIntToHex(selectedRole.color)
    : undefined;

  return (
    <SelectorPanel<GuildRole>
      header=<RolesSettingsHeader />
      searchBar={
        <Card className="mx-3 mt-3 mb-3 shrink-0 border-border bg-card/40 p-3 backdrop-blur-sm">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Szukaj roli..."
            className="h-9"
          />
        </Card>
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
              backgroundColor: `#${colorIntToHex(role.color)}`,
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
