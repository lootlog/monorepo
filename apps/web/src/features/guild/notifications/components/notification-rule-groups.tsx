import { ListGroupHeading } from "@/components/common/list-group-heading";
import { LIST_BAND_HEADING_CLASS } from "@/components/common/list-tile";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import { groupBy } from "es-toolkit";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { NotificationsOverview } from "../use-notifications-overview";
import { NotificationRuleRow } from "./notification-rule-row";
import { useCancelNotificationJob } from "./use-cancel-notification-job";

const GROUP_ORDER = [
  NotificationTriggerType.TIMER_BEFORE_SPAWN,
  NotificationTriggerType.HERO_SIGHTED,
  NotificationTriggerType.SCHEDULED_MESSAGE,
] as const;

type NotificationRuleGroupsProps = {
  overview: NotificationsOverview;
  rules: NotificationsOverview["rules"];
  /** Shown in place of the groups when no rule is left. */
  empty: ReactNode;
};

/** Rules grouped by what triggers them: spawn reminders, hero sightings, then scheduled messages. */
export const NotificationRuleGroups = ({
  overview,
  rules,
  empty,
}: NotificationRuleGroupsProps) => {
  const { t } = useTranslation();
  const { cancelJob } = useCancelNotificationJob();
  const groups = groupBy(rules, (rule) => rule.triggerType);

  if (rules.length === 0) return empty;

  return GROUP_ORDER.flatMap((type) => {
    const groupRules = groups[type] ?? [];

    if (groupRules.length === 0) return [];

    return (
      <section key={type} aria-labelledby={`notification-rules-${type}`}>
        <ListGroupHeading
          id={`notification-rules-${type}`}
          count={groupRules.length}
          className={LIST_BAND_HEADING_CLASS}
        >
          {t(`settings.notifications.groups.${type}`)}
        </ListGroupHeading>
        {groupRules.map((rule) => (
          <NotificationRuleRow
            key={rule.id}
            rule={rule}
            actionsDisabled={!overview.hasRequiredPermissions}
            nextJob={overview.getNextJob(rule.id)}
            lastJob={overview.getLastJob(rule.id)}
            onCancelJob={cancelJob}
          />
        ))}
      </section>
    );
  });
};
