import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  getCoordinationPriorityLabelKey,
  getCoordinationPriorityTone,
} from "../../utils/coordination-utils";
import type { EventCoordinationResponseDtoHeroesItemPriority } from "@lootlog/client/main";
import { EventCoordinationPriorityIcon } from "./event-coordination-priority-icon";

interface EventCoordinationPriorityBadgeProps {
  priority: EventCoordinationResponseDtoHeroesItemPriority;
}

export const EventCoordinationPriorityBadge = ({
  priority,
}: EventCoordinationPriorityBadgeProps) => {
  const { t } = useTranslation();

  return (
    <Badge
      variant={getCoordinationPriorityTone(priority) ?? "secondary"}
      className="gap-1 text-xs"
    >
      <EventCoordinationPriorityIcon priority={priority} />
      {t(getCoordinationPriorityLabelKey(priority))}
    </Badge>
  );
};
