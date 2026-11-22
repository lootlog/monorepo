import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { DatabaseZap, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type LootDirectSearchNoticeProps = {
  term: string;
  onClear: () => void;
  className?: string;
};

export const LootDirectSearchNotice = ({
  term,
  onClear,
  className,
}: LootDirectSearchNoticeProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2",
        className,
      )}
    >
      <DatabaseZap className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {t("loots.searchCommand.directSearchActive", { term })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("loots.searchCommand.directSearchActiveHint")}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="shrink-0 text-xs"
      >
        <X className="size-3" />
        {t("loots.searchCommand.directSearchClear")}
      </Button>
    </div>
  );
};
