import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";

type ClearFiltersButtonProps = {
  onClear: () => void;
  label?: string;
};

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
