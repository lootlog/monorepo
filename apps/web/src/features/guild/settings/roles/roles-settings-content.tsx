import { ResultsSurface } from "@/components/common/results-surface";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { Capability } from "@lootlog/schema/permissions";
import { SearchX, Shield } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { RoleTile } from "./role-tile";

export const RolesSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  const {
    data: roles,
    isError,
    isFetching,
    refetch,
  } = useRolesControllerGetGuildRoles({ guildId });

  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredRoles = (roles ?? [])
    .filter((role) => role.name.toLowerCase().includes(normalizedSearchValue))
    .sort((firstRole, secondRole) => {
      const firstRoleIsAdmin = firstRole.permissions.includes(Capability.ADMIN);

      const secondRoleIsAdmin = secondRole.permissions.includes(
        Capability.ADMIN,
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

  const renderContent = () => {
    if (!roles && isError) {
      return (
        <SettingsListError
          title={t("settings.roles.empty.loadError")}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      );
    }

    if (!roles) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <ListTileSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (roles.length === 0) {
      return (
        <SettingsListEmpty
          icon={Shield}
          title={t("settings.roles.empty.title")}
          description={t("settings.roles.empty.description")}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={ROUTES.guild.settings.info(guildId)} />}
            >
              {t("settings.roles.empty.checkSync")}
            </Button>
          }
        />
      );
    }

    if (filteredRoles.length === 0) {
      return (
        <SettingsListEmpty
          icon={SearchX}
          title={t("settings.roles.empty.filteredTitle")}
          description={t("settings.roles.empty.filteredDescription")}
          action={
            <ClearFiltersButton
              onClear={() => startTransition(() => setSearchValue(""))}
            />
          }
        />
      );
    }

    return filteredRoles.map((role) => (
      <RoleTile key={role.id} guildId={guildId} role={role} />
    ));
  };

  return (
    <SettingsTabPage title={t("settings.roles.title")}>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={searchValue}
            placeholder={t("settings.roles.searchPlaceholder")}
            onChange={setSearchValue}
          />
        }
      >
        {renderContent()}
      </ResultsSurface>
    </SettingsTabPage>
  );
};
