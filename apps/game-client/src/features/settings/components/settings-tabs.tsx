import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsSearchField } from "@/components/settings/settings-search-field";
import {
  getSettingsSearchOptionId,
  SettingsSearchResults,
} from "@/components/settings/settings-search-results";
import { SettingsSubsectionBar } from "@/components/settings/settings-subsection-bar";
import { SettingsWindowShell } from "@/components/settings/settings-window-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { resolveSettingsPath } from "@/features/settings/constants/settings-tabs";
import {
  SETTINGS_DOMAIN_ICONS,
  SETTINGS_SUBSECTION_CONTENT,
} from "@/features/settings/settings-content";
import {
  getVisibleSettingsManifest,
  isSettingsControlId,
} from "@/features/settings/settings-manifest";
import {
  buildSettingsSearchItems,
  searchSettings,
  type SettingsSearchItem,
} from "@/features/settings/settings-search";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

const SEARCH_RESULTS_ID = "settings-search-results";

const isSearchShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";

/** Window width below which the domain list collapses to an icon rail. */
const SETTINGS_COMPACT_WIDTH = 600;

export const SettingsTabs = () => {
  const { t } = useTranslation();
  const activeTab = useWindowsStore((state) => state.settings.state?.activeTab);

  const activeSubsection = useWindowsStore(
    (state) => state.settings.state?.activeSubsection,
  );

  const settingsWidth = useWindowsStore((state) => state.settings.size.width);
  const setSettingsPath = useWindowsStore((state) => state.setSettingsPath);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const query = useSettingsUiStore((state) => state.query);
  const setQuery = useSettingsUiStore((state) => state.setQuery);
  const clearQuery = useSettingsUiStore((state) => state.clearQuery);

  const selectedResultIndex = useSettingsUiStore(
    (state) => state.selectedResultIndex,
  );

  const setSelectedResultIndex = useSettingsUiStore(
    (state) => state.setSelectedResultIndex,
  );

  const overlayOpen = useSettingsUiStore((state) => state.overlayOpen);
  const setOverlayOpen = useSettingsUiStore((state) => state.setOverlayOpen);
  const openControl = useSettingsUiStore((state) => state.openControl);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const path = resolveSettingsPath(activeTab, activeSubsection);
  const visibleDomains = getVisibleSettingsManifest();

  const activeDomain =
    visibleDomains.find((domain) => domain.id === path.domain) ??
    visibleDomains[0];

  const selectedSubsection = activeDomain.subsections.some(
    (subsection) => subsection.id === path.subsection,
  )
    ? path.subsection
    : activeDomain.subsections[0].id;

  const results = searchSettings(
    buildSettingsSearchItems(visibleDomains, t),
    query,
  );

  const isCompact = settingsWidth < SETTINGS_COMPACT_WIDTH;

  useEffect(() => {
    if (overlayOpen) searchInputRef.current?.focus();
  }, [overlayOpen]);

  // Search and highlight state belongs to one open window.
  useEffect(() => () => useSettingsUiStore.getState().reset(), []);

  const navigate = (domainId: string, subsectionId?: string) => {
    const domain = visibleDomains.find(({ id }) => id === domainId);

    if (!domain) return;

    const subsection =
      domain.subsections.find(({ id }) => id === subsectionId) ??
      domain.subsections[0];

    setSettingsPath(domain.id, subsection.id);
    setOverlayOpen(false);
  };

  const openSearchResult = (result: SettingsSearchItem) => {
    if (isSettingsControlId(result.controlId)) {
      openControl(result.controlId);

      return;
    }

    navigate(result.categoryId, result.subsectionId);
    clearQuery();
  };

  const focusSearch = () => {
    if (isCompact) setOverlayOpen(true);
    searchInputRef.current?.focus();
  };

  const handleShellKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      focusSearch();

      return;
    }

    if (event.key !== "Escape") return;
    event.preventDefault();

    if (query) {
      clearQuery();

      return;
    }

    if (overlayOpen) {
      setOverlayOpen(false);

      return;
    }

    setOpen("settings", false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedResultIndex(
        Math.min(selectedResultIndex + 1, Math.max(results.length - 1, 0)),
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedResultIndex(Math.max(selectedResultIndex - 1, 0));

      return;
    }

    const selectedResult = results[selectedResultIndex];

    if (
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      selectedResult
    ) {
      event.preventDefault();
      openSearchResult(selectedResult);
    }
  };

  const activeOption = results[selectedResultIndex];
  const SubsectionContent = SETTINGS_SUBSECTION_CONTENT[selectedSubsection];

  const search = (
    <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:gap-2">
      <SettingsSearchField
        inputRef={searchInputRef}
        value={query}
        placeholder={t("settings.search.placeholder")}
        label={t("settings.search.ariaLabel")}
        clearLabel={t("settings.search.clear")}
        listboxId={SEARCH_RESULTS_ID}
        activeOptionId={
          activeOption
            ? getSettingsSearchOptionId(activeOption.controlId)
            : undefined
        }
        onChange={setQuery}
        onClear={clearQuery}
        onKeyDown={handleSearchKeyDown}
      />
      {query ? (
        <ScrollArea className="ll:min-h-0 ll:flex-1">
          <SettingsSearchResults
            id={SEARCH_RESULTS_ID}
            label={t("settings.search.results")}
            emptyLabel={t("settings.search.empty")}
            query={query}
            results={results}
            selectedResultIndex={selectedResultIndex}
            onSelectIndex={setSelectedResultIndex}
            onOpen={openSearchResult}
          />
        </ScrollArea>
      ) : null}
    </div>
  );

  const nav = (
    <SettingsNav
      domains={visibleDomains.map((domain) => ({
        id: domain.id,
        label: t(domain.labelKey),
        icon: SETTINGS_DOMAIN_ICONS[domain.icon],
      }))}
      activeDomainId={activeDomain.id}
      compact={isCompact}
      label={t("settings.nav.domains")}
      searchLabel={t("settings.search.ariaLabel")}
      onSelect={(domainId) => navigate(domainId)}
      onOpenSearch={focusSearch}
    />
  );

  return (
    <Tabs
      value={activeDomain.id}
      onValueChange={(domainId) => navigate(String(domainId))}
      className="ll:h-full ll:min-h-0 ll:w-full ll:gap-0"
    >
      <SettingsWindowShell
        compact={isCompact}
        nav={isCompact || !query ? nav : null}
        search={search}
        searchOverlayOpen={overlayOpen}
        searchExpanded={Boolean(query)}
        subsections={
          activeDomain.subsections.length > 1 ? (
            <SettingsSubsectionBar
              label={t("settings.nav.subsections")}
              options={activeDomain.subsections.map((subsection) => ({
                id: subsection.id,
                label: t(subsection.labelKey),
              }))}
              activeId={selectedSubsection}
              onSelect={(subsectionId) =>
                navigate(activeDomain.id, subsectionId)
              }
            />
          ) : undefined
        }
        onKeyDown={handleShellKeyDown}
      >
        <TabsContent
          value={activeDomain.id}
          className="ll:mt-0 ll:flex ll:flex-col ll:gap-6"
        >
          <SubsectionContent />
        </TabsContent>
      </SettingsWindowShell>
    </Tabs>
  );
};
