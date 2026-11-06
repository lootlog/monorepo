import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Plus } from "lucide-react";
import type { FC } from "react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import {
  LOOTLOG_STRIP_TILE_CLASS,
  LootlogStripTile,
} from "./lootlog-strip-tile";

const DASHED_TILE_CLASS =
  "flex size-11 items-center justify-center rounded-lg border border-dashed border-sidebar-foreground/30 text-sidebar-foreground/60";

type GuildNavCreateProps = {
  /** `strip` is the labelled tile of the phone sheet. */
  variant?: "rail" | "strip";
  onSelect?: () => void;
};

// Ends the guild list like Discord's "Add a Server", sized as a guild avatar.
export const GuildNavCreate: FC<GuildNavCreateProps> = ({
  variant = "rail",
  onSelect,
}) => {
  const { t } = useTranslation();

  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();

  const open = () => {
    onSelect?.();
    dispatch({ type: "OPEN" });
  };

  if (variant === "strip") {
    return (
      <button type="button" className={LOOTLOG_STRIP_TILE_CLASS} onClick={open}>
        <LootlogStripTile label={t("layout.guildsSelector.create")}>
          <span className={DASHED_TILE_CLASS}>
            <Plus aria-hidden="true" className="size-5" />
          </span>
        </LootlogStripTile>
      </button>
    );
  }

  return (
    <div className="mb-2 flex w-full items-center justify-center">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={t("ui.tooltips.createLootlog")}
              className={cn(
                DASHED_TILE_CLASS,
                "cursor-pointer transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              )}
              onClick={open}
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          }
        />
        <TooltipContent side="right">
          {t("ui.tooltips.createLootlog")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
