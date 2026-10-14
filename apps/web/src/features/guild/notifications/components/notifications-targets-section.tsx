import type {
  GuildNotificationRulesResponseDto,
  NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  getGuildNotificationOrphanedRuleCount,
  getGuildNotificationTargetUsageCount,
} from "../utils/notification-settings.utils";
import { NotificationTargetTile } from "./notification-target-tile";
import { NotificationsSection } from "./notifications-section";

type NotificationsTargetsSectionProps = {
  targets: NotificationTargetResponseDto[];
  /** Every rule, so usage counts ignore the page's filter. */
  rules: GuildNotificationRulesResponseDto["items"];
  actionsDisabled: boolean;
  isFiltered: boolean;
  onEditTarget: (target: NotificationTargetResponseDto) => void;
};

export const NotificationsTargetsSection = ({
  targets,
  rules,
  actionsDisabled,
  isFiltered,
  onEditTarget,
}: NotificationsTargetsSectionProps) => {
  const { t } = useTranslation();

  let emptyLabel: string | undefined;

  if (targets.length === 0) {
    emptyLabel = isFiltered
      ? t("settings.notifications.empty.filteredTargets")
      : t("settings.notifications.empty.targets");
  }

  return (
    <NotificationsSection
      id="notifications-targets"
      title={t("settings.notifications.sections.targets")}
      count={targets.length}
      emptyLabel={emptyLabel}
    >
      {targets.map((target) => (
        <NotificationTargetTile
          key={target.id}
          target={target}
          usageCount={getGuildNotificationTargetUsageCount(target.id, rules)}
          orphanedRuleCount={getGuildNotificationOrphanedRuleCount(
            target.id,
            rules,
          )}
          actionsDisabled={actionsDisabled}
          onEdit={onEditTarget}
        />
      ))}
    </NotificationsSection>
  );
};
