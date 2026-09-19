import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type WarningWindowActionsProps = {
  onClose: () => void;
  onOpenSettings: () => void;
};

export const WarningWindowActions: FC<WarningWindowActionsProps> = ({
  onClose,
  onOpenSettings,
}) => {
  const { t } = useTranslation("common");

  return (
    <div className="ll:flex ll:justify-end ll:gap-2">
      <Button
        variant="secondary"
        size="xs"
        onClick={onClose}
        className="ll:px-3 ll:py-1"
      >
        {t("actions.close")}
      </Button>
      <Button
        variant="secondary"
        size="xs"
        onClick={onOpenSettings}
        className="ll:px-3 ll:py-1"
      >
        {t("actions.openSettings")}
      </Button>
    </div>
  );
};
