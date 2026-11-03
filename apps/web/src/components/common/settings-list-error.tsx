import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { RetryButton } from "@/components/common/retry-button";

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
      action={<RetryButton onRetry={onRetry} isRetrying={isRetrying} />}
    />
  );
};
