import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ExternalLink, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

export const LootHeaderActions = ({
  commentsCount,
  onOpenDetails,
}: {
  commentsCount: number;
  onOpenDetails: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="ghost"
        size="sm"
        icon={<MessageSquare className="size-3.5" />}
        className={cn(
          "h-8 gap-1 px-2 text-xs",
          commentsCount === 0 ? "text-muted-foreground" : "text-foreground",
        )}
        aria-label={t("loots.list.commentsCount", { count: commentsCount })}
        title={t("loots.list.commentsCount", { count: commentsCount })}
      >
        <span className="tabular-nums">{commentsCount}</span>
      </Button>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="secondary"
        size="sm"
        icon={<ExternalLink className="size-3.5" />}
        aria-label={t("loots.list.details")}
        title={t("loots.list.details")}
        className="h-8 px-2.5 text-xs max-sm:w-8 max-sm:px-0"
      >
        <span className="max-sm:sr-only">{t("loots.list.details")}</span>
      </Button>
    </div>
  );
};
