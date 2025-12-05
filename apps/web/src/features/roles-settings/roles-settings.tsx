import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildRoles,
  type GuildRole,
} from "@/hooks/api/guilds/use-guild-roles";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { RolePanelContent } from "@/features/roles-settings/components/roles-panel";
import { RoleListItem } from "@/features/roles-settings/components/role-list-item";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { Shield } from "lucide-react";
import { Permission } from "@lootlog/types";

export const RolesSettings = () => {
  const { data: roles } = useGuildRoles();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRole, setSelectedRole] = useState<GuildRole | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectRole = (role: GuildRole) => {
    setSelectedRole(role);
    if (isMobile) {
      setIsMobileDrawerOpen(true);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      setIsMobileDrawerOpen(false);
    }
  }, [isMobile]);

  const filteredRoles = roles
    ?.filter((role) => {
      return role.name.toLowerCase().includes(searchValue.toLowerCase());
    })
    .sort((a, b) => {
      const aIsAdmin = a.permissions.includes(Permission.ADMIN);
      const bIsAdmin = b.permissions.includes(Permission.ADMIN);

      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      const permDiff = b.permissions.length - a.permissions.length;
      if (permDiff !== 0) return permDiff;

      return a.name.localeCompare(b.name);
    });

  const selectedRoleColor =
    selectedRole?.color === 0
      ? "FFF"
      : selectedRole?.color.toString(16).padStart(6, "0");

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileDrawerOpen}
          onOpenChange={(open) => {
            setIsMobileDrawerOpen(open);
            if (!open) setSelectedRole(null);
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle className="flex items-center gap-3">
                {selectedRole && (
                  <>
                    <div
                      className="size-4 rounded-full"
                      style={{ backgroundColor: `#${selectedRoleColor}` }}
                    />
                    <span>{selectedRole.name}</span>
                  </>
                )}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              {selectedRole && (
                <RolePanelContent
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  selectedRoleColor={selectedRoleColor}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                Ustawienia ról
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                Zarządzaj uprawnieniami dla ról Discord
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 border-b shrink-0 bg-background">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Szukaj roli..."
            className="bg-input/30 h-9"
          />
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden bg-background/50">
          <div
            className={cn(
              "flex flex-col h-full min-w-0 overflow-hidden",
              !isMobile && selectedRole
                ? "w-1/3 min-w-[220px] max-w-[350px] border-r"
                : "flex-1",
            )}
          >
            <ScrollArea className="flex-1 h-full">
              <div className="p-3 space-y-1.5">
                {filteredRoles?.map((role, index) => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    isSelected={selectedRole?.id === role.id}
                    onClick={() => handleSelectRole(role)}
                    index={index}
                    isPanelOpen={selectedRole !== null}
                  />
                ))}

                {filteredRoles?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Shield className="size-12 mb-4 opacity-30" />
                    <p className="text-sm font-medium">Nie znaleziono ról</p>
                    <p className="text-xs mt-1">
                      Spróbuj zmienić kryteria wyszukiwania
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {!isMobile && selectedRole && (
            <div className="h-full flex-1 min-w-0">
              <div className="h-full min-w-[400px]">
                <RolePanelContent
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  selectedRoleColor={selectedRoleColor}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
