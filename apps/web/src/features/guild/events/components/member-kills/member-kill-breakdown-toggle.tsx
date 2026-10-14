import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

type MemberKillBreakdownToggleProps = {
  monsterName: string;
  isExpanded: boolean;
  onToggle: () => void;
};

/** Shows or hides how the member's points for a kill add up. */
export const MemberKillBreakdownToggle = ({
  monsterName,
  isExpanded,
  onToggle,
}: MemberKillBreakdownToggleProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={isExpanded}
      aria-label={t(
        isExpanded
          ? "events.kills.collapseBreakdown"
          : "events.kills.expandBreakdown",
        { monsterName },
      )}
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground"
    >
      <ChevronDown
        className={cn(
          "size-4 transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
          isExpanded && "rotate-180",
        )}
      />
    </Button>
  );
};
