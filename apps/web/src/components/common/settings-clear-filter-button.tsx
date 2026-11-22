import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";

export const SettingsClearFilterButton = ({
  onClear,
}: {
  onClear: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Button type="button" variant="outline" onClick={onClear}>
      {t("settings.clearFilter")}
    </Button>
  );
};
