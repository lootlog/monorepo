import { ListChecks, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { NotificationRuleCard } from "./notification-rule-card";
import type { GuildNotificationRulesResponseDto } from "@lootlog/client/main";

type NotificationsRulesCardProps = {
  rules: GuildNotificationRulesResponseDto["items"];
  limits: GuildNotificationRulesResponseDto["limits"] | undefined;
  actionsDisabled: boolean;
};

export const NotificationsRulesCard = ({
  rules,
  limits,
  actionsDisabled,
}: NotificationsRulesCardProps) => {
  const { t } = useTranslation();
  const hasInactiveTargets = rules.some((rule) =>
    rule.targets.some(({ target }) => !target.active),
  );

  return (
    <Card className="gap-3 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2.5">
          <ListChecks className="size-4 text-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">
            {t("settings.notifications.sections.rules")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sections.rulesDescription")}
          </p>
        </div>
        {limits ? (
          <Badge variant="secondary">
            {t("settings.notifications.ruleLimitUsage", {
              count: limits.ruleCount,
              limit: limits.ruleLimit,
            })}
          </Badge>
        ) : null}
      </div>
      {hasInactiveTargets ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-500">
          <TriangleAlert className="size-3.5 shrink-0" />
          {t("settings.notifications.inactiveTargetsWarning")}
        </p>
      ) : null}
      {rules.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <NotificationRuleCard
              key={rule.id}
              rule={rule}
              actionsDisabled={actionsDisabled}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background p-6 text-sm text-muted-foreground">
          {t("settings.notifications.empty.rules")}
        </div>
      )}
    </Card>
  );
};
