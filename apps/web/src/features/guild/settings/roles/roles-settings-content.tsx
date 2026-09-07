import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SearchInput } from "@/components/ui/search-input";
import { RolesTable } from "@/features/guild/settings/roles/roles-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { Button } from "@lootlog/ui/components/button";

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
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background px-3 pb-3 gap-3">
      <h1 className="sr-only">{t("settings.roles.title")}</h1>
      <SectionCard className="max-h-full shrink-0">
        <SectionCardContent className="flex min-h-0 flex-col gap-0 p-0">
          <TableFilterToolbar>
            <SearchInput
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("settings.roles.searchPlaceholder")}
              className="h-9"
              wrapperClassName="w-full min-w-0 sm:min-w-[200px] sm:flex-1"
            />
          </TableFilterToolbar>

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
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
