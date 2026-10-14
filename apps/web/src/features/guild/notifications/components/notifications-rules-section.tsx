import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { GuildNotificationRulesResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NotificationRuleTile } from "./notification-rule-tile";
import { NotificationsSection } from "./notifications-section";

type NotificationsRulesSectionProps = {
  rules: GuildNotificationRulesResponseDto["items"];
  limits: GuildNotificationRulesResponseDto["limits"] | undefined;
  actionsDisabled: boolean;
  /** The list is narrowed by the page's filter. */
  isFiltered: boolean;
};

export const NotificationsRulesSection = ({
  rules,
  limits,
  actionsDisabled,
  isFiltered,
}: NotificationsRulesSectionProps) => {
  const { t } = useTranslation();

  const hasInactiveTargets = rules.some((rule) =>
    rule.targets.some(({ target }) => !target.active),
  );

  let emptyLabel: string | undefined;

  if (rules.length === 0) {
    emptyLabel = isFiltered
      ? t("settings.notifications.empty.filteredRules")
      : t("settings.notifications.empty.rules");
  }

  return (
    <NotificationsSection
      id="notifications-rules"
      title={t("settings.notifications.sections.rules")}
      count={
        limits
          ? t("settings.notifications.ruleLimitShort", {
              count: limits.ruleCount,
              limit: limits.ruleLimit,
            })
          : rules.length
      }
      notice={
        hasInactiveTargets && (
          <p
            data-list-tile
            className={cn(
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
              "flex items-center gap-1.5 py-2 text-xs text-signal-timer",
            )}
          >
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            {t("settings.notifications.inactiveTargetsWarning")}
          </p>
        )
      }
      emptyLabel={emptyLabel}
    >
      {rules.map((rule) => (
        <NotificationRuleTile
          key={rule.id}
          rule={rule}
          actionsDisabled={actionsDisabled}
        />
      ))}
    </NotificationsSection>
  );
};
