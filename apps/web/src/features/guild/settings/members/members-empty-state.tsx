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
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import type { MemberStatusFilter } from "./member-list-item.utils";

const STATUS_ICONS: Record<Exclude<MemberStatusFilter, "all">, LucideIcon> = {
  active: UserX,
  inactive: UserCheck,
  online: Radio,
  problems: ShieldCheck,
};

type MembersEmptyStateProps = {
  hasMembers: boolean;
  searchMatchCount: number;
  search: string;
  statusFilter: MemberStatusFilter;
  onClearSearch: () => void;
  onShowAll: () => void;
};

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
        title={t("settings.members.empty.filteredTitle")}
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
            <ClearFiltersButton onClear={onClearSearch} />
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
