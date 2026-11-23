import { Badge } from "@lootlog/ui/components/badge";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

export const UnreadLootsBadge = ({ count }: { count: number }) => {
  const { t } = useTranslation();
  const countChange = useChangeCount(count);

  return (
    <Badge
      variant="destructive"
      className="pointer-events-none absolute bottom-0.5 right-0.5 z-20 h-4.5 min-w-4.5 animate-pop-in justify-center px-1 text-2xs leading-none ring-2 ring-sidebar motion-reduce:animate-none"
    >
      <span
        key={countChange}
        className={cn(
          "inline-block",
          countChange > 0 && "animate-bump motion-reduce:animate-none",
        )}
      >
        {count > 99 ? t("layout.guildsSelector.unreadLootsOverflow") : count}
      </span>
    </Badge>
  );
};
