import { useTranslation } from "react-i18next";
import { Capability } from "@lootlog/domain/access-policy";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { GroupFightsContent } from "./group-fights-content";

export function GroupFightsPage() {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const permissions = useGuildPermissions();
  if (permissions.isPending)
    return <p role="status">{t("groupFights.loading")}</p>;
  if (
    !guildId ||
    !permissions.data?.allows(Capability.LOOTLOG_GROUP_FIGHTS_READ)
  ) {
    return (
      <Alert>
        <AlertDescription>{t("groupFights.forbidden")}</AlertDescription>
      </Alert>
    );
  }
  return <GroupFightsContent key={guildId} guildId={guildId} />;
}
