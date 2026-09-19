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
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="secondary"
        size="sm"
      >
        <MessageSquare />
        <span className="font-medium">{commentsCount}</span>
      </Button>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        variant="secondary"
        size="sm"
      >
        <ExternalLink />
        <span className="font-medium">{t("loots.list.details")}</span>
      </Button>
    </div>
  );
};
