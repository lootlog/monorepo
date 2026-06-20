import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CircleDashed,
} from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import {
  getCoordinationPriorityLabelKey,
  getCoordinationPriorityTone,
} from "../../utils/coordination-utils";
import type { EventCoordinationResponseDtoHeroesItemPriority } from "@/lib/api/generated/main/model";

interface EventCoordinationPriorityBadgeProps {
  priority: EventCoordinationResponseDtoHeroesItemPriority;
}

export const EventCoordinationPriorityBadge = ({
  priority,
}: EventCoordinationPriorityBadgeProps) => {
  const { t } = useTranslation();
  const tone = getCoordinationPriorityTone(priority);
  const Icon = getPriorityIcon(priority);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs",
        tone === "destructive" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-500",
        tone === "success" &&
          "border-green-500/30 bg-green-500/10 text-green-500",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {t(getCoordinationPriorityLabelKey(priority))}
    </Badge>
  );
};

function getPriorityIcon(
  priority: EventCoordinationResponseDtoHeroesItemPriority,
) {
  if (priority === "CRITICAL") {
    return AlertTriangle;
  }

  if (priority === "WARNING") {
    return Clock3;
  }

  if (priority === "OK") {
    return CheckCircle2;
  }

  return CircleDashed;
}
