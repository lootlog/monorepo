import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
} from "lucide-react";
import type { EventCoordinationResponseDtoHeroesItemPriority } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item-priority";

type EventCoordinationPriorityIconProps = {
  priority: EventCoordinationResponseDtoHeroesItemPriority;
};

export const EventCoordinationPriorityIcon = ({
  priority,
}: EventCoordinationPriorityIconProps) => {
  if (priority === "CRITICAL") {
    return <AlertTriangle className="size-3" />;
  }
  if (priority === "WARNING") {
    return <Clock3 className="size-3" />;
  }
  if (priority === "OK") {
    return <CheckCircle2 className="size-3" />;
  }
  return <CircleDashed className="size-3" />;
};
