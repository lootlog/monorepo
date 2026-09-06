import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ListChecks, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";

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
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.sections.rules")}
        icon={ListChecks}
        description={t("settings.notifications.sections.rulesDescription")}
        actions={
          <div className="flex items-center gap-3">
            {limits ? (
              <Badge variant="secondary">
                {t("settings.notifications.ruleLimitUsage", {
                  count: limits.ruleCount,
                  limit: limits.ruleLimit,
                })}
              </Badge>
            ) : null}
          </div>
        }
      />
      <SectionCardContent className="flex flex-col gap-3">
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
          <div className="py-6 text-sm text-muted-foreground">
            {t("settings.notifications.empty.rules")}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
};
