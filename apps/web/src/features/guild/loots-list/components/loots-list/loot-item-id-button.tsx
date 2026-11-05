import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCopyItemId } from "@/hooks/use-copy-item-id";
import { formatItemHid } from "@/lib/utils/hid-detection";

/**
 * Copies an item's `ITEM#…` identifier for the search or the game chat. With
 * several copies of one item, a menu picks which copy's identifier.
 */
export const LootItemIdButton = ({
  hids,
  world,
}: {
  hids: string[];
  world: string;
}) => {
  const { t } = useTranslation();
  const { copyItemId, copyingId } = useCopyItemId();
  const formattedHids = hids.map((hid) => formatItemHid(hid, world));
  const [onlyHid] = formattedHids;

  if (formattedHids.length === 1 && onlyHid) {
    return (
      <Button
        size="icon-sm"
        variant="ghost"
        className="shrink-0 text-muted-foreground"
        onClick={() => void copyItemId(onlyHid)}
        loading={copyingId === onlyHid}
        disabled={copyingId !== null}
        aria-label={t("loots.details.copyId")}
        title={`${t("loots.details.copyId")}\n${onlyHid}`}
      >
        <Copy className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground"
            aria-label={t("loots.details.copyId")}
            title={t("loots.details.copyId")}
          />
        }
      >
        <Copy className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("loots.details.copyId")}</DropdownMenuLabel>
          {formattedHids.map((formattedHid, index) => (
            <DropdownMenuItem
              key={formattedHid}
              onClick={() => void copyItemId(formattedHid)}
            >
              <Copy className="size-4" />
              <span className="shrink-0">
                {t("loots.details.itemCopy", { index: index + 1 })}
              </span>
              <code className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                {formattedHid.slice(5, 13)}…
              </code>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
