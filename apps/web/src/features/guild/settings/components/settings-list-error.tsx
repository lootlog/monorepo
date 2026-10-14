import { Button } from "@lootlog/ui/components/button";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "./settings-list-empty";

type SettingsListErrorProps = {
  title: string;
  isRetrying: boolean;
  onRetry: () => void;
};

/** Takes a settings list's place when it could not be loaded. */
export const SettingsListError = ({
  title,
  isRetrying,
  onRetry,
}: SettingsListErrorProps) => {
  const { t } = useTranslation();

  return (
    <SettingsListEmpty
      icon={CircleAlert}
      title={title}
      description={t("settings.loadErrorDescription")}
      action={
        <Button
          type="button"
          variant="outline"
          loading={isRetrying}
          icon=<RotateCcw className="size-3.5" />
          onClick={onRetry}
        >
          {t("common.actions.retry")}
        </Button>
      }
    />
  );
};
