import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";

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
      className={cn(
        "h-6 max-w-full gap-1.5 rounded-md border-border/60 bg-muted/40 px-1.5 text-[11px] font-medium normal-case tracking-normal text-muted-foreground shadow-none",
        className,
      )}
    >
      <Avatar className="size-4 shrink-0 rounded-[4px]">
        <AvatarImage src={iconUrl ?? undefined} alt="" />
        <AvatarFallback className="rounded-[4px] text-[8px] font-semibold">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </Badge>
  );
}
