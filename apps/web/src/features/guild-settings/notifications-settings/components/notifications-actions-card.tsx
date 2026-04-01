import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
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
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
          <Settings className="size-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold">
          {t("settings.notifications.sections.actions")}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          disabled={!hasRequiredPermissions}
          onClick={onAddTarget}
        >
          {t("settings.notifications.actions.addTarget")}
        </Button>
        {hasRequiredPermissions && !isRuleLimitReached ? (
          <Button size="sm" asChild>
            <Link to={ROUTES.guild.settings.notificationCreate(guildId ?? "")}>
              {t("settings.notifications.actions.addRule")}
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled>
            {t("settings.notifications.actions.addRule")}
          </Button>
        )}
      </div>
    </Card>
  );
};
