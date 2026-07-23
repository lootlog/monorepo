import { SearchInput } from "@/components/ui/search-input";
import { RolesSettingsHeader } from "@/features/guild/settings/roles/roles-settings-header";
import { RolesTable } from "@/features/guild/settings/roles/roles-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@lootlog/api-client/react-query/main/roles";
import { Permission } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { FilterX, Shield } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";

export const RolesSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: roles } = useRolesControllerGetGuildRoles({
    guildId: guildId ?? "",
  });
  const [searchValue, setSearchValue] = useState("");
  const isMobile = useIsMobile();
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredRoles = [...(roles ?? [])]
    .filter((role) => role.name.toLowerCase().includes(normalizedSearchValue))
    .sort((firstRole, secondRole) => {
      const firstRoleIsAdmin = firstRole.permissions.includes(Permission.ADMIN);
      const secondRoleIsAdmin = secondRole.permissions.includes(
        Permission.ADMIN,
      );

      if (firstRoleIsAdmin && !secondRoleIsAdmin) return -1;
      if (!firstRoleIsAdmin && secondRoleIsAdmin) return 1;

      const firstRolePosition = firstRole.position ?? 0;
      const secondRolePosition = secondRole.position ?? 0;
      if (firstRolePosition !== secondRolePosition) {
        return secondRolePosition - firstRolePosition;
      }

      return firstRole.name.localeCompare(secondRole.name);
    });
  const hasActiveFilters = normalizedSearchValue !== "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background/50 px-3 gap-3">
      <RolesSettingsHeader />
      <Card className="p-0 gap-0">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("settings.roles.searchPlaceholder")}
            className="h-9"
            wrapperClassName="w-full xl:max-w-md 2xl:max-w-xl"
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="h-full flex-1">
              <div className="w-full max-w-full min-w-0">
                {filteredRoles.length > 0 && (
                  <RolesTable
                    guildId={guildId ?? ""}
                    isMobile={isMobile}
                    roles={filteredRoles}
                  />
                )}
                {filteredRoles.length === 0 && (
                  <div className="flex min-h-80 flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground">
                    <Shield className="mb-4 size-12 opacity-30" />
                    <p className="text-sm font-medium">
                      {roles?.length === 0
                        ? t("settings.roles.emptyGuildTitle")
                        : t("settings.roles.emptyTitle")}
                    </p>
                    <p className="mt-1 text-xs">
                      {hasActiveFilters
                        ? t("settings.roles.emptyFilteredDescription")
                        : t("settings.roles.emptyDescription")}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                          startTransition(() => setSearchValue(""))
                        }
                      >
                        <FilterX className="size-4" />
                        {t("settings.roles.resetFilters")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>
    </div>
  );
};
