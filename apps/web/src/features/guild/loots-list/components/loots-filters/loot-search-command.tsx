import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { LootSearchResults } from "./loot-search-results";
import { LootSearchHitContent } from "./loot-search-hit-content";
import { GuildSearchPages } from "./guild-search-pages";

import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Kbd } from "@lootlog/ui/components/kbd";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useRef } from "react";
import { LootDirectSearchNotice } from "./loot-direct-search-notice";
import { EmptyState } from "@/components/common/empty-state";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import {
  ArrowRight,
  CircleAlert,
  ClipboardPaste,
  PackageSearch,
  SearchX,
} from "lucide-react";
import { useLootSearchCommand } from "./use-loot-search-command";

import {
  allTrue,
  containerVariants,
  getPlayerRowValue,
  isInScope,
  renderIf,
  type GuildSearchScope,
} from "./loot-search-presentation";
import { useGuildSearchRows } from "./use-guild-search-rows";
import { GuildSearchFooter } from "./guild-search-footer";
import { GuildSearchDirectRow } from "./guild-search-direct-row";
import { LoadingSlot } from "@/components/common/loading-slot";

export const LootSearchCommand = (
  props: Parameters<typeof useLootSearchCommand>[0],
) => {
  const {
    t,
    activeDirectSearch,
    canSearchDirectly,
    handleDirectSearch,
    handleClearDirectSearch,
    searchQuery,
    setSearchQuery,
    trimmedSearch,
    canSearchLoots,
    world,
    pageResults,
    handleSelectPage,
    showKeepTyping,
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

  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    activeScope,
    setScope,
    scopeOptions,
    showDirectSearch,
    selectedValue,
    selectValue,
  } = useGuildSearchRows({
    trimmedSearch,
    pageResults,
    showSearchResults,
    npcValues: npcResults.map((npc) => `npc-${npc.name}`),
    itemValues: itemResults.map((item) => `item-${item.name}`),
    playerValues: playerResults.map(getPlayerRowValue),
    hidValue: isHid && hidItem ? `hid-${hidItem.hid}` : null,
    canSearchDirectly,
  });

  // Typing and Enter keep working after a scope is picked with the pointer.
  const handleScopeChange = (nextScope: GuildSearchScope) => {
    setScope(nextScope);
    inputRef.current?.focus();
  };

  const handlePaletteOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setScope("all");

    handleOpenChange(nextOpen);
  };

  const dialogContent = (
    <>
      <div className="relative">
        <CommandInput
          ref={inputRef}
          placeholder={t("loots.searchCommand.placeholder")}
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="pr-14 text-base"
        />
        <Kbd className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 max-md:hidden">
          Esc
        </Kbd>
      </div>
      {scopeOptions.length > 1 && (
        // Five scopes do not fit a phone; the grouped list scrolls instead.
        <div className="border-b border-border px-2.5 py-2 max-md:hidden">
          <AnimatedToggleGroup
            size="sm"
            label={t("loots.searchCommand.scopeLabel")}
            value={activeScope}
            onValueChange={handleScopeChange}
            options={[
              { value: "all", label: t("loots.searchCommand.scopeAll") },
              ...scopeOptions.map(({ group, count }) => ({
                value: group,
                label: `${t(`loots.searchCommand.${group}`)} ${count}`,
              })),
            ]}
          />
        </div>
      )}
      <CommandList className="custom-scrollbar max-h-[min(60dvh,30rem)] min-h-48 p-1.5">
        {pageResults.length > 0 && isInScope(activeScope, "pages") && (
          <GuildSearchPages pages={pageResults} onSelect={handleSelectPage} />
        )}
        {renderIf(
          allTrue(!trimmedSearch, pageResults.length > 0, canSearchLoots),
          <div className="mx-1 mt-1 flex items-center gap-3 px-2.5 py-2 text-sm text-muted-foreground">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
              <ClipboardPaste className="size-4 text-primary" />
            </span>
            <span className="min-w-0">
              {t("loots.searchCommand.hidHint")}{" "}
              <code className="font-mono text-foreground">
                {t("loots.searchCommand.hidExample")}
              </code>
            </span>
          </div>,
        )}
        <AnimatePresence mode="wait" initial={false}>
          {renderIf(
            allTrue(!trimmedSearch, pageResults.length === 0),
            <m.div
              key="idle"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col"
            >
              <EmptyState
                compact
                icon={PackageSearch}
                title={t("loots.searchCommand.idleTitle")}
                description={t("loots.searchCommand.startTyping")}
                className="flex-1"
                action={
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground sm:flex">
                    <ClipboardPaste className="size-4 text-primary" />
                    <span>{t("loots.searchCommand.hidHint")}</span>
                    <code className="col-span-2 font-mono text-foreground sm:col-auto">
                      {t("loots.searchCommand.hidExample")}
                    </code>
                  </div>
                }
              />
            </m.div>,
          )}

          {renderIf(
            showKeepTyping,
            <m.div
              key="keep-typing"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex h-full flex-col"
            >
              <EmptyState
                compact
                icon={PackageSearch}
                title={t("loots.searchCommand.keepTyping")}
                className="flex-1"
              />
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
              <div className="flex size-11 items-center justify-center rounded-lg border border-signal-timer/30 bg-signal-timer/10">
                <CircleAlert className="size-5 text-signal-timer" />
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
              <LoadingSlot size="small" />
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
              <div className="flex size-11 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
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
              <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-background">
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
                  <LootSearchHitContent
                    hit={{ kind: "hid", item: hidItem, term: trimmedSearch }}
                  />
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
              <LoadingSlot size="small" className="mb-3" />
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
              className="flex h-full flex-col"
            >
              <EmptyState
                compact
                icon={CircleAlert}
                title={t("common.searchUnavailable")}
                className="flex-1"
              />
            </m.div>,
          )}

          {renderIf(
            showSearchResults,
            <LootSearchResults
              key="search-results"
              world={world}
              scope={activeScope}
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
              className="flex h-full flex-col"
            >
              <EmptyState
                compact
                icon={SearchX}
                title={t("loots.searchCommand.noResults")}
                description={t("loots.searchCommand.noResultsDescription")}
                className="flex-1"
              />
            </m.div>,
          )}
        </AnimatePresence>

        {showDirectSearch && (
          <GuildSearchDirectRow
            term={trimmedSearch}
            onSelect={handleDirectSearch}
          />
        )}
      </CommandList>

      {activeDirectSearch && (
        <div className="border-t border-border p-2">
          <LootDirectSearchNotice
            term={activeDirectSearch}
            onClear={handleClearDirectSearch}
          />
        </div>
      )}

      <GuildSearchFooter world={world} />
    </>
  );

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={handlePaletteOpenChange}
      value={selectedValue}
      onValueChange={selectValue}
      title={t("loots.searchCommand.dialogTitle")}
      description={t("loots.searchCommand.dialogDescription")}
      // Esc closes it on a keyboard; phones get the close button instead.
      showCloseButton={isMobile}
      className="top-[12vh] w-[calc(100%-1rem)] max-w-[600px] translate-y-0 rounded-xl border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.55)] max-md:top-2 sm:max-w-[600px] [&_[data-slot=command]]:rounded-xl [&_[data-slot=command]]:bg-card"
    >
      {dialogContent}
    </CommandDialog>
  );
};
