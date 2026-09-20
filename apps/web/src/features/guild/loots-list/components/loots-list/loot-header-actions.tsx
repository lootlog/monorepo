import { Button } from "@lootlog/ui/components/button";
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
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="secondary"
        size="sm"
        aria-label={t("loots.list.commentsCount", { count: commentsCount })}
        title={t("loots.list.commentsCount", { count: commentsCount })}
      >
        <MessageSquare />
        <span className="font-medium tabular-nums">{commentsCount}</span>
      </Button>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="secondary"
        size="sm"
        aria-label={t("loots.list.details")}
        title={t("loots.list.details")}
        className="max-sm:size-9 max-sm:px-0"
      >
        <ExternalLink />
        <span className="font-medium max-sm:sr-only">
          {t("loots.list.details")}
        </span>
      </Button>
    </div>
  );
};
