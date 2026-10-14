import { Button } from "@lootlog/ui/components/button";
import {
  Radio,
  SearchX,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsClearFilterButton } from "../components/settings-clear-filter-button";
import { SettingsListEmpty } from "../components/settings-list-empty";
import type { MemberStatusFilter } from "./member-list-item.utils";

/** Each status that can come up empty: what that means, and its icon. */
const STATUS_ICONS: Record<Exclude<MemberStatusFilter, "all">, LucideIcon> = {
  active: UserX,
  inactive: UserCheck,
  online: Radio,
  problems: ShieldCheck,
};

type MembersEmptyStateProps = {
  /** Whether the Organization has any members at all. */
  hasMembers: boolean;
  /** How many members match the name filter across every status. */
  searchMatchCount: number;
  search: string;
  statusFilter: MemberStatusFilter;
  onClearSearch: () => void;
  onShowAll: () => void;
};

/**
 * Why the member list is empty: no members yet, a name that matches nobody,
 * a name that matches only in other statuses, or a status nobody is in.
 */
export const MembersEmptyState = ({
  hasMembers,
  searchMatchCount,
  search,
  statusFilter,
  onClearSearch,
  onShowAll,
}: MembersEmptyStateProps) => {
  const { t } = useTranslation();
  const query = search.trim();

  const showAllButton = (
    <Button type="button" variant="outline" onClick={onShowAll}>
      {t("settings.members.empty.showAll")}
    </Button>
  );

  if (!hasMembers) {
    return (
      <SettingsListEmpty
        icon={Users}
        title={t("settings.members.empty.title")}
        description={t("settings.members.empty.description")}
      />
    );
  }

  if (query) {
    const matchesElsewhere = statusFilter !== "all" && searchMatchCount > 0;

    return (
      <SettingsListEmpty
        icon={SearchX}
        title={t("settings.members.empty.filteredTitle", { query })}
        description={
          matchesElsewhere
            ? t("settings.members.empty.filteredInOtherStatuses", {
                status: t(`settings.members.filters.${statusFilter}`),
              })
            : t("settings.members.empty.filteredDescription")
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {matchesElsewhere && showAllButton}
            <SettingsClearFilterButton onClear={onClearSearch} />
          </div>
        }
      />
    );
  }

  if (statusFilter === "all") {
    return (
      <SettingsListEmpty
        icon={Users}
        title={t("settings.members.empty.title")}
        description={t("settings.members.empty.description")}
      />
    );
  }

  return (
    <SettingsListEmpty
      icon={STATUS_ICONS[statusFilter]}
      title={t(`settings.members.empty.status.${statusFilter}.title`)}
      description={t(
        `settings.members.empty.status.${statusFilter}.description`,
      )}
      action={showAllButton}
    />
  );
};
