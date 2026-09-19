import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@lootlog/ui/components/combobox";
import { Spinner } from "@lootlog/ui/components/spinner";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import type { SearchItemsResponseDtoOutputHitsItem } from "@lootlog/client/search";
import { cn } from "cn";

type GameItem = SearchItemsResponseDtoOutputHitsItem;

type WatchedItemSelectorProps = {
  disabled?: boolean;
  loading: boolean;
  items: GameItem[];
  searchValue: string;
  selectedItem: Pick<GameItem, "id" | "name" | "icon" | "rarity"> | null;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  errorMessage?: string;
  loadingMessage: string;
  disabledMessage: string;
  onSearchChange: (value: string) => void;
  onSelect: (item: GameItem | null) => void;
};

export const WatchedItemSelector = ({
  disabled = false,
  loading,
  items,
  searchValue,
  selectedItem,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  errorMessage,
  loadingMessage,
  disabledMessage,
  onSearchChange,
  onSelect,
}: WatchedItemSelectorProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const visibleItems = errorMessage ? [] : items;
  const itemIds = visibleItems.map((item) => item.id);

  const displayLabel = selectedItem
    ? t("settings.userNotifications.itemSelector.selectedLabel", {
        name: selectedItem.name,
        id: selectedItem.id,
      })
    : placeholder;

  return (
    <Combobox
      value={selectedItem?.id ?? null}
      items={itemIds}
      filteredItems={itemIds}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      inputValue={searchValue}
      onInputValueChange={(nextValue, details) => {
        if (details.reason === "input-change") onSearchChange(nextValue);
      }}
      onValueChange={(nextId) => {
        const item = items.find((item) => item.id === nextId) ?? null;
        onSelect(item);
        onSearchChange(item?.name ?? "");
        setOpen(false);
      }}
    >
      <div className="relative">
        <ComboboxTrigger
          render={<Button variant="outline" />}
          className={cn(
            "w-full justify-between gap-2",
            selectedItem && "pr-12",
          )}
        >
          {selectedItem ? (
            <ItemImage
              icon={selectedItem.icon}
              rarity={resolveItemRarity(selectedItem.rarity)}
            />
          ) : (
            <Search className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              !selectedItem && "text-muted-foreground",
            )}
          >
            {disabled ? disabledMessage : displayLabel}
          </span>
        </ComboboxTrigger>
        <ComboboxClear
          tabIndex={0}
          aria-label={t("common.clear")}
          className="absolute right-7 top-1/2 -translate-y-1/2"
        />
      </div>
      <ComboboxContent className="w-[360px]" align="start">
        <ComboboxInput
          showTrigger={false}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
        {errorMessage ? (
          <div role="alert" className="px-3 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        {loading && !errorMessage ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {loadingMessage}
          </div>
        ) : null}
        {!loading && !errorMessage ? (
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        ) : null}
        <ComboboxList>
          {visibleItems.map((item) => (
            <ComboboxItem key={item.id} value={item.id} className="gap-3">
              <ItemImage
                icon={item.icon}
                rarity={resolveItemRarity(item.rarity)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.userNotifications.itemSelector.itemId", {
                    id: item.id,
                  })}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {t("settings.userNotifications.itemSelector.itemLevel", {
                  level: item.lvl,
                })}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
