import { useTranslation } from "react-i18next";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { useOrganizationPresence } from "@/hooks/use-organization-presence";

export const OrganizationPresenceStatus = ({
  guildId,
}: {
  guildId: string | undefined;
}) => {
  const { t } = useTranslation();
  const { status, refetch } = useOrganizationPresence(guildId);

  if (!guildId || status === "ready" || status === "loading") return null;

  return (
    <QueryErrorNotice
      message={t(`common.presence.${status}`)}
      onRetry={refetch}
    />
  );
};
