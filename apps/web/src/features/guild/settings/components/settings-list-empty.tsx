import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@lootlog/ui/components/button";
import { FilterX, SearchX, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type SettingsListEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Offers clearing the filters while any of them narrows the list. */
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

/** What a settings list shows under its toolbar when no tile is left. */
export const SettingsListEmpty = ({
  icon,
  title,
  description,
  hasActiveFilters,
  onResetFilters,
}: SettingsListEmptyProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-3">
      <EmptyState
        framed
        icon={hasActiveFilters ? SearchX : icon}
        title={title}
        description={description}
        action={
          hasActiveFilters && (
            <Button type="button" variant="outline" onClick={onResetFilters}>
              <FilterX data-icon="inline-start" aria-hidden />
              {t("settings.resetFilters")}
            </Button>
          )
        }
      />
    </div>
  );
};
