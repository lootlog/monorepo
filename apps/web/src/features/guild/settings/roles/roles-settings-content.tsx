import { ListToolbar } from "@/components/common/list-toolbar";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { Shield } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "../components/settings-list-empty";
import { SettingsTabPage } from "../components/settings-tab-page";
import { RoleTile } from "./role-tile";

export const RolesSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { data: roles } = useRolesControllerGetGuildRoles({ guildId });
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredRoles = (roles ?? [])
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

  const renderContent = () => {
    if (!roles) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <ListTileSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (filteredRoles.length === 0) {
      return (
        <SettingsListEmpty
          icon={Shield}
          title={
            roles.length === 0
              ? t("settings.roles.emptyGuildTitle")
              : t("settings.roles.emptyTitle")
          }
          description={
            hasActiveFilters
              ? t("settings.roles.emptyFilteredDescription")
              : t("settings.roles.emptyDescription")
          }
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => startTransition(() => setSearchValue(""))}
        />
      );
    }

    return filteredRoles.map((role) => (
      <RoleTile key={role.id} guildId={guildId} role={role} />
    ));
  };

  return (
    <SettingsTabPage title={t("settings.roles.title")}>
      <ListToolbar
        search={searchValue}
        onSearchChange={setSearchValue}
        placeholder={t("settings.roles.searchPlaceholder")}
        label={t("settings.roles.searchPlaceholder")}
        clearLabel={t("settings.clearFilter")}
        disabled={!roles}
      />
      {renderContent()}
    </SettingsTabPage>
  );
};
