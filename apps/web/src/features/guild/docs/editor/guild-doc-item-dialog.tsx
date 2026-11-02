import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { ItemSearchHitContent } from "@/components/tiles/item-search-hit-content";
import { formatItemHid, parseItemHid } from "@/lib/utils/hid-detection";
import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Check, Package } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { GuildDocItem } from "./guild-doc-item-node";
import {
  useGuildDocItemCandidates,
  type ItemCandidate,
} from "./use-guild-doc-item-candidates";

type GuildDocItemDialogProps = {
  /** The item being changed, or null to insert a new one. */
  initialItem: GuildDocItem | null;
  open: boolean;
  onInsert: (item: GuildDocItem) => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * Picks an item from the catalog. A pasted `ITEM#…` identifier is kept for
 * readers to copy, and finds the item itself when one of the Organization's
 * loots recorded it; it can also stand alone until the item is known.
 */
export const GuildDocItemDialog = ({
  initialItem,
  open,
  onInsert,
  onOpenChange,
}: GuildDocItemDialogProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [itemIdInput, setItemIdInput] = useState("");
  const [selected, setSelected] = useState<ItemCandidate | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);

    if (open) {
      setSearch("");
      setItemIdInput(initialItem?.itemId ?? "");
      setSelected(null);
    }
  }

  const parsedItemId = parseItemHid(itemIdInput);
  const itemIdInvalid = itemIdInput.trim().length > 0 && !parsedItemId;

  const candidates = useGuildDocItemCandidates({
    initialItem,
    itemHid: parsedItemId,
    search,
  });

  // The loot's copy wins until the writer picks another entry themselves.
  const chosen = selected ?? candidates.loot ?? candidates.current;

  const canSubmit =
    (chosen !== null || parsedItemId !== null) && !itemIdInvalid;

  const handleSearchChange = (value: string) => {
    // An identifier typed into the search belongs in its own field.
    if (parseItemHid(value)) {
      setItemIdInput(value.trim());
      setSearch("");

      return;
    }

    setSearch(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canSubmit) {
      return;
    }

    onInsert({
      snapshot: chosen?.item ?? null,
      itemId: parsedItemId
        ? formatItemHid(parsedItemId.hid, parsedItemId.world)
        : null,
    });
    onOpenChange(false);
  };

  const renderCandidate = (candidate: ItemCandidate) => (
    <CommandItem
      key={candidate.key}
      value={candidate.key}
      onSelect={() => setSelected(candidate)}
      className="min-h-11"
    >
      <ItemSearchHitContent item={{ ...candidate.item, lvl: candidate.lvl }} />
      <Check
        aria-hidden="true"
        className={
          chosen?.key === candidate.key
            ? "size-4 text-primary"
            : "size-4 opacity-0"
        }
      />
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <IconDialogHeader
          icon={Package}
          title={
            initialItem
              ? t("docs.itemDialog.editTitle")
              : t("docs.itemDialog.title")
          }
          description={t("docs.itemDialog.description")}
        />

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="guild-doc-item-search">
              {t("docs.itemDialog.item")}
            </Label>
            <Command
              shouldFilter={false}
              className="rounded-md border border-border bg-transparent"
            >
              <CommandInput
                id="guild-doc-item-search"
                value={search}
                placeholder={t("docs.itemDialog.searchPlaceholder")}
                onValueChange={handleSearchChange}
              />
              <CommandList className="max-h-64">
                {candidates.showEmpty && (
                  <CommandEmpty>{t("docs.itemDialog.empty")}</CommandEmpty>
                )}
                {candidates.current && (
                  <CommandGroup heading={t("docs.itemDialog.current")}>
                    {renderCandidate(candidates.current)}
                  </CommandGroup>
                )}
                {candidates.loot && (
                  <CommandGroup heading={t("docs.itemDialog.fromLoots")}>
                    {renderCandidate(candidates.loot)}
                  </CommandGroup>
                )}
                {candidates.catalog.length > 0 && (
                  <CommandGroup heading={t("docs.itemDialog.fromCatalog")}>
                    {candidates.catalog.map(renderCandidate)}
                  </CommandGroup>
                )}
                {candidates.catalogError && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("docs.itemDialog.searchError")}
                  </p>
                )}
              </CommandList>
            </Command>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guild-doc-item-id">
              {t("docs.itemDialog.itemId")}
            </Label>
            <Input
              id="guild-doc-item-id"
              name="guild-doc-item-id"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              value={itemIdInput}
              placeholder="ITEM#…"
              aria-invalid={itemIdInvalid}
              aria-describedby="guild-doc-item-id-hint"
              onChange={(event) => setItemIdInput(event.target.value)}
            />
            <p
              id="guild-doc-item-id-hint"
              className={
                itemIdInvalid
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {itemIdInvalid
                ? t("docs.itemDialog.itemIdInvalid")
                : t("docs.itemDialog.itemIdHint")}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {initialItem
                ? t("docs.itemDialog.save")
                : t("docs.itemDialog.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
