import { Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { NotificationTargetCard } from "./notification-target-card";
import type {
  GuildNotificationRule,
  GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { getGuildNotificationTargetUsageCount } from "../utils/notification-settings.utils";

type NotificationsTargetsCardProps = {
  targets: GuildNotificationTarget[];
  rules: GuildNotificationRule[];
  actionsDisabled: boolean;
  onEditTarget: (target: GuildNotificationTarget) => void;
};

export const NotificationsTargetsCard = ({
  targets,
  rules,
  actionsDisabled,
  onEditTarget,
}: NotificationsTargetsCardProps) => {
  const { t } = useTranslation();

  return (
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-500/10 p-2.5 shadow-inner shadow-indigo-500/10">
          <Hash className="size-4 text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">
            {t("settings.notifications.sections.targets")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sections.targetsDescription")}
          </p>
        </div>
        <Badge variant="secondary">{targets.length}</Badge>
      </div>
      {targets.length > 0 ? (
        <div className="flex flex-col gap-3">
          {targets.map((target) => (
            <NotificationTargetCard
              key={target.id}
              target={target}
              usageCount={getGuildNotificationTargetUsageCount(
                target.id,
                rules,
              )}
              actionsDisabled={actionsDisabled}
              onEdit={onEditTarget}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
          {t("settings.notifications.empty.targets")}
        </div>
      )}
    </Card>
  );
};
