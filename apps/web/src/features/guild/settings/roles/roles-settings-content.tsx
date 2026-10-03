import { SettingsTableCard } from "@/features/guild/settings/components/settings-table-card";
import { RolesTable } from "@/features/guild/settings/roles/roles-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";

import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Shield } from "lucide-react";
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

  return (
    <SettingsTableCard
      title={t("settings.roles.title")}
      search={{
        value: searchValue,
        placeholder: t("settings.roles.searchPlaceholder"),
        onChange: setSearchValue,
      }}
      isEmpty={filteredRoles.length === 0}
      empty={{
        icon: Shield,
        title:
          roles?.length === 0
            ? t("settings.roles.emptyGuildTitle")
            : t("settings.roles.emptyTitle"),
        description: hasActiveFilters
          ? t("settings.roles.emptyFilteredDescription")
          : t("settings.roles.emptyDescription"),
      }}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={() => startTransition(() => setSearchValue(""))}
    >
      <RolesTable
        guildId={guildId ?? ""}
        isMobile={isMobile}
        roles={filteredRoles}
      />
    </SettingsTableCard>
  );
};
