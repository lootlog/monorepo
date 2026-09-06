import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";

import { NotificationTargetCard } from "./notification-target-card";
import type { GuildNotificationRulesResponseDto } from "@lootlog/client/main";
import type { NotificationTargetResponseDto } from "@lootlog/client/main";
import {
  getGuildNotificationTargetUsageCount,
  getGuildNotificationOrphanedRuleCount,
} from "../utils/notification-settings.utils";

type NotificationsTargetsCardProps = {
  targets: NotificationTargetResponseDto[];
  rules: GuildNotificationRulesResponseDto["items"];
  actionsDisabled: boolean;
  onEditTarget: (target: NotificationTargetResponseDto) => void;
};

export const NotificationsTargetsCard = ({
  targets,
  rules,
  actionsDisabled,
  onEditTarget,
}: NotificationsTargetsCardProps) => {
  const { t } = useTranslation();

  return (
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.sections.targets")}
        icon={Hash}
        description={t("settings.notifications.sections.targetsDescription")}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{targets.length}</Badge>
          </div>
        }
      />
      <SectionCardContent className="flex flex-col gap-3">
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
                orphanedRuleCount={getGuildNotificationOrphanedRuleCount(
                  target.id,
                  rules,
                )}
                actionsDisabled={actionsDisabled}
                onEdit={onEditTarget}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-sm text-muted-foreground">
            {t("settings.notifications.empty.targets")}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
};
