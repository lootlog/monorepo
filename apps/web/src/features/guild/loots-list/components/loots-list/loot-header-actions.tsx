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
      {" "}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
      >
        <MessageSquare className="h-3 w-3" />
        <span className="font-medium">{commentsCount}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails();
        }}
        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="font-medium">{t("loots.list.details")}</span>
      </button>
    </div>
  );
};
