import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";

import { useGuildId } from "@/hooks/context/use-guild-id";
import { ROUTES } from "@/config/routes";

type NotificationsActionsCardProps = {
  hasRequiredPermissions: boolean;
  isRuleLimitReached: boolean;
  onAddTarget: () => void;
};

export const NotificationsActionsCard = ({
  hasRequiredPermissions,
  isRuleLimitReached,
  onAddTarget,
}: NotificationsActionsCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  return (
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.sections.actions")}
        icon={Settings}
      />
      <SectionCardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            disabled={!hasRequiredPermissions}
            onClick={onAddTarget}
          >
            {t("settings.notifications.actions.addTarget")}
          </Button>
          {hasRequiredPermissions && !isRuleLimitReached ? (
            <Button
              size="sm"
              render={
                <Link to={ROUTES.guild.notifications.create(guildId ?? "")}>
                  {t("settings.notifications.actions.addRule")}
                </Link>
              }
              nativeButton={false}
            />
          ) : (
            <Button size="sm" disabled>
              {t("settings.notifications.actions.addRule")}
            </Button>
          )}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
