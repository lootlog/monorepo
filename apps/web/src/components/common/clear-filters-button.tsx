import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";

type ClearFiltersButtonProps = {
  onClear: () => void;
  /** For a list narrowed by something other than its filters, such as a tab. */
  label?: string;
};

/** Clears a list's filters from its "no matching results" state. */
export const ClearFiltersButton = ({
  onClear,
  label,
}: ClearFiltersButtonProps) => {
  const { t } = useTranslation();

  return (
    <Button type="button" variant="outline" onClick={onClear}>
      {label ?? t("common.actions.clearFilters")}
    </Button>
  );
};
