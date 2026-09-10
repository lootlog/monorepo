import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { LootSearchResults } from "./loot-search-results";

import { ItemRarity } from "@/lib/loots/loot-types";
import { Spinner } from "@lootlog/ui/components/spinner";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import {
  ArrowRight,
  CircleAlert,
  ClipboardPaste,
  PackageSearch,
  SearchX,
} from "lucide-react";
import { useLootSearchCommand } from "./use-loot-search-command";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

import {
  allTrue,
  containerVariants,
  renderIf,
} from "./loot-search-presentation";

export const LootSearchCommand = (
  props: Parameters<typeof useLootSearchCommand>[0],
) => {
  const {
    t,
    searchQuery,
    setSearchQuery,
    trimmedSearch,
    isHidInput,
    isHid,
    isHidLoading,
    isHidError,
    showHidNotFound,
    hidItem,
    handleSelectItemByHid,
    showSearchLoading,
    showSearchError,
    showSearchResults,
    npcResults,
    handleSelectNpc,
    itemResults,
    handleSelectItem,
    playerResults,
    handleSelectPlayer,
    showNoResults,
    open,
    handleOpenChange,
  } = useLootSearchCommand(props);
  const dialogContent = (
    <>
      <CommandInput
        placeholder={t("loots.searchCommand.placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
        className="h-14 pr-12 text-base"
      />
      <CommandList className="custom-scrollbar h-[min(60dvh,32rem)] max-h-[min(60dvh,32rem)] p-2 [&>div]:h-full">
        <AnimatePresence mode="wait" initial={false}>
          {renderIf(
            !trimmedSearch,
            <m.div
              key="idle"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-background">
                <PackageSearch className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.idleTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.startTyping")}
              </p>
              <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground sm:flex">
                <ClipboardPaste className="size-4 text-primary" />
                <span>{t("loots.searchCommand.hidHint")}</span>
                <code className="col-span-2 font-mono text-foreground sm:col-auto">
                  {t("loots.searchCommand.hidExample")}
                </code>
              </div>
            </m.div>,
          )}

          {renderIf(
            allTrue(!isHidInput, trimmedSearch.length === 1),
            <m.div
              key="keep-typing"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <PackageSearch className="size-6 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("loots.searchCommand.keepTyping")}
              </p>
            </m.div>,
          )}

          {renderIf(
            allTrue(isHidInput, !isHid),
            <m.div
              key="invalid-hid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <CircleAlert className="size-5 text-amber-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidInvalidTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidInvalidDescription")}
              </p>
              <code className="mt-3 rounded-md bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
                {t("loots.searchCommand.hidExample")}
              </code>
            </m.div>,
          )}

          {renderIf(
            allTrue(isHid, isHidLoading),
            <m.div
              key="hid-loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <Spinner className="size-6 text-primary" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidLoadingTitle")}
              </h3>
              <code className="mt-2 max-w-full truncate font-mono text-xs text-muted-foreground">
                {trimmedSearch}
              </code>
            </m.div>,
          )}

          {renderIf(
            allTrue(isHid, isHidError),
            <m.div
              key="hid-error"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
                <CircleAlert className="size-5 text-destructive" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidErrorTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidErrorDescription")}
              </p>
            </m.div>,
          )}

          {renderIf(
            showHidNotFound,
            <m.div
              key="hid-not-found"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                <SearchX className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidNotFoundTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidNotFoundDescription")}
              </p>
              <code className="mt-3 max-w-full truncate font-mono text-xs text-muted-foreground">
                {trimmedSearch}
              </code>
            </m.div>,
          )}

          {isHid && hidItem && (
            <m.div
              key="hid-result"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CommandGroup heading={t("loots.searchCommand.itemById")}>
                <CommandItem
                  value={`hid-${hidItem.hid}`}
                  onSelect={() => handleSelectItemByHid(hidItem.hid)}
                  className="min-h-14 rounded-lg px-3 py-2"
                >
                  <ItemImage
                    icon={hidItem.icon}
                    rarity={hidItem.rarity ?? ItemRarity.COMMON}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{hidItem.name}</div>
                    <div className="mt-0.5 flex min-w-0 text-xs text-muted-foreground">
                      <code className="truncate font-mono">
                        {trimmedSearch}
                      </code>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-primary" />
                </CommandItem>
              </CommandGroup>
            </m.div>
          )}

          {renderIf(
            showSearchLoading,
            <m.div
              key="search-loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center py-10 text-muted-foreground"
            >
              <Spinner className="mb-3 size-6 text-primary" />
              <span className="text-sm">
                {t("loots.searchCommand.loading")}
              </span>
            </m.div>,
          )}

          {renderIf(
            showSearchError,
            <m.div
              key="search-error"
              role="alert"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center text-sm text-destructive"
            >
              <CircleAlert className="size-5" />
              {t("common.searchUnavailable")}
            </m.div>,
          )}

          {renderIf(
            showSearchResults,
            <LootSearchResults
              key="search-results"
              npcResults={npcResults}
              t={t}
              handleSelectNpc={handleSelectNpc}
              itemResults={itemResults}
              handleSelectItem={handleSelectItem}
              playerResults={playerResults}
              handleSelectPlayer={handleSelectPlayer}
            />,
          )}

          {renderIf(
            showNoResults,
            <m.div
              key="no-results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                <SearchX className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.noResults")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.noResultsDescription")}
              </p>
            </m.div>,
          )}
        </AnimatePresence>
      </CommandList>
    </>
  );

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={handleOpenChange}
      title={t("loots.searchCommand.dialogTitle")}
      description={t("loots.searchCommand.dialogDescription")}
      className="top-1/2 w-[calc(100%-2rem)] max-w-xl rounded-2xl border-border bg-popover shadow-[0_24px_80px_rgba(0,0,0,0.45)] [&_[data-slot=command]]:rounded-2xl [&_[data-slot=command]]:bg-popover"
    >
      {dialogContent}
    </CommandDialog>
  );
};
