import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";

type ReservationOrganizationBadgeProps = {
  name: string;
  iconUrl?: string | null;
  className?: string;
};

export function ReservationOrganizationBadge({
  name,
  iconUrl,
  className,
}: ReservationOrganizationBadgeProps) {
  const fallback = name.charAt(0).toUpperCase() || "?";

  return (
    <Badge
      variant="outline"
      size="sm"
      className={cn("max-w-full pl-0.5", className)}
    >
      <Avatar className="size-4 shrink-0">
        <AvatarImage src={iconUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[8px] font-semibold">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </Badge>
  );
}
