import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { RetryButton } from "@/components/common/retry-button";

type SettingsListErrorProps = {
  title: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export const SettingsListError = ({
  title,
  isRetrying,
  onRetry,
}: SettingsListErrorProps) => {
  const { t } = useTranslation();

  return (
    <SettingsListEmpty
      icon={AlertCircle}
      title={title}
      description={t("settings.loadErrorDescription")}
      action={<RetryButton onRetry={onRetry} isRetrying={isRetrying} />}
    />
  );
};
