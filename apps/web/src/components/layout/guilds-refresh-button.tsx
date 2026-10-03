import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type GuildsRefreshButtonProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

export const GuildsRefreshButton: FC<GuildsRefreshButtonProps> = ({
  isRefreshing,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("ui.tooltips.refreshServers")}
            loading={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="right">
        {t("ui.tooltips.refreshServers")}
      </TooltipContent>
    </Tooltip>
  );
};
