import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  LOOTLOG_STRIP_TILE_CLASS,
  LootlogStripTile,
} from "./lootlog-strip-tile";

type GuildsRefreshButtonProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  /** `strip` is the labelled tile of the phone sheet. */
  variant?: "rail" | "strip";
};

export const GuildsRefreshButton: FC<GuildsRefreshButtonProps> = ({
  isRefreshing,
  onRefresh,
  variant = "rail",
}) => {
  const { t } = useTranslation();

  if (variant === "strip") {
    return (
      <button
        type="button"
        className={LOOTLOG_STRIP_TILE_CLASS}
        aria-label={t("ui.tooltips.refreshServers")}
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <LootlogStripTile label={t("layout.guildsSelector.refresh")}>
          <span className="flex size-11 items-center justify-center rounded-lg bg-sidebar-accent/60 text-sidebar-foreground/70">
            {isRefreshing ? (
              <Spinner className="size-4" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
          </span>
        </LootlogStripTile>
      </button>
    );
  }

  return (
    <div className="flex justify-center pb-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-lg"
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
    </div>
  );
};
