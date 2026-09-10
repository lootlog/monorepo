import { SETTINGS_COMPACT_WIDTH } from "@/components/settings/settings-density";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsRecentlyChanged } from "@/components/settings/settings-recently-changed";
import { SettingsSearchField } from "@/components/settings/settings-search-field";
import {
  getSettingsSearchOptionId,
  SettingsSearchResults,
} from "@/components/settings/settings-search-results";
import { SettingsSubsectionBar } from "@/components/settings/settings-subsection-bar";
import { SettingsWindowShell } from "@/components/settings/settings-window-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BattlePanelSettingsTab } from "@/features/settings/components/battle-panel/battle-panel-settings-tab";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { ChatAppearanceSettingsForm } from "@/features/settings/components/chat/chat-appearance-settings";
import { ChatFiltersSettings } from "@/features/settings/components/chat/chat-filters-settings";
import { DebugTab } from "@/features/settings/components/debug/debug-tab";
import { DetectorSettingsTab } from "@/features/settings/components/detector/detector-settings-tab";
import { GeneralSettingsTab } from "@/features/settings/components/general/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers/hidden-timers-tab";
import { HotkeysSettingsTab } from "@/features/settings/components/hotkeys/hotkeys-settings-tab";
import { InformationSettingsTab } from "@/features/settings/components/information/information-settings-tab";
import { LogsSettingsTab } from "@/features/settings/components/logs/logs-settings-tab";
import { NotificationMutesSettingsTab } from "@/features/settings/components/notification-mutes/notification-mutes-settings-tab";
import { NotificationsSettingsTab } from "@/features/settings/components/notifications/notifications-settings-tab";
import { SoundsSettingsTab } from "@/features/settings/components/sounds/sounds-settings-tab";
import { ServerVisibilitySettingsTab } from "@/features/settings/components/servers/server-visibility-settings-tab";
import { NpcColorsSettings } from "@/features/settings/components/npc-colors/npc-colors-settings";
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsColors } from "@/features/settings/components/timers/timers-settings-colors";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";
import {
  resolveSettingsPath,
  type SettingsSubsectionValue,
} from "@/features/settings/constants/settings-tabs";
import { useRecentlyChangedStore } from "@/features/settings/recently-changed.store";
import {
  getVisibleSettingsManifest,
  isSettingsControlId,
  type SettingsIconName,
} from "@/features/settings/settings-manifest";
import {
  buildSettingsSearchItems,
  searchSettings,
  type SettingsSearchItem,
} from "@/features/settings/settings-search";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  Activity,
  Bell,
  Clock,
  Database,
  Info,
  Keyboard,
  MessageSquare,
  Palette,
  Server,
  Settings,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const ICONS = {
  settings: Settings,
  server: Server,
  palette: Palette,
  messageSquare: MessageSquare,
  clock: Clock,
  database: Database,
  bell: Bell,
  volume2: Volume2,
  keyboard: Keyboard,
  activity: Activity,
  info: Info,
} satisfies Record<SettingsIconName, LucideIcon>;

const SEARCH_RESULTS_ID = "settings-search-results";

const SETTINGS_CONTENT = {
  visibility: () => <ServerVisibilitySettingsTab />,
  behavior: () => <GeneralSettingsTab />,
  "chat-appearance": () => <ChatAppearanceSettingsForm />,
  "chat-filters": () => <ChatFiltersSettings />,
  "npc-colors": () => <NpcColorsSettings />,
  "timer-appearance": () => <TimersSettingsAppearance />,
  "timer-colors": () => <TimersSettingsColors />,
  "timer-behavior": () => <TimersSettingsGeneral />,
  "hidden-timers": () => <HiddenTimersTab />,
  catching: () => <CatchingSettings />,
  detector: () => <DetectorSettingsTab />,
  "battle-panel": () => <BattlePanelSettingsTab />,
  "notification-rules": () => <NotificationsSettingsTab />,
  "notification-mutes": () => <NotificationMutesSettingsTab />,
  sounds: () => <SoundsSettingsTab />,
  hotkeys: () => <HotkeysSettingsTab />,
  logs: () => <LogsSettingsTab />,
  debug: () => <DebugTab />,
  build: () => <InformationSettingsTab />,
} satisfies Record<SettingsSubsectionValue, () => ReactNode>;

const isSearchShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";

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
  const view = useSettingsUiStore((state) => state.view);
  const setView = useSettingsUiStore((state) => state.setView);
  const openControl = useSettingsUiStore((state) => state.openControl);

  const hasRecentEntries = useRecentlyChangedStore(
    (state) => state.entries.length > 0,
  );

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
  const showRecent = view === "recent" && hasRecentEntries && !query;

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
    setView("path");
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

  const search = (
    <>
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
            results={results}
            selectedResultIndex={selectedResultIndex}
            onSelectIndex={setSelectedResultIndex}
            onOpen={openSearchResult}
          />
        </ScrollArea>
      ) : null}
    </>
  );

  const nav = (
    <SettingsNav
      domains={visibleDomains.map((domain) => ({
        id: domain.id,
        label: t(domain.labelKey),
        icon: ICONS[domain.icon],
      }))}
      activeDomainId={showRecent ? "" : activeDomain.id}
      compact={isCompact}
      label={t("settings.nav.domains")}
      searchLabel={t("settings.search.ariaLabel")}
      onSelect={(domainId) => navigate(domainId)}
      onOpenSearch={focusSearch}
    />
  );

  return (
    <Tabs
      value={showRecent ? "recent" : activeDomain.id}
      onValueChange={(domainId) => navigate(String(domainId))}
      className="ll:h-full ll:min-h-0 ll:w-full ll:gap-0"
    >
      <SettingsWindowShell
        compact={isCompact}
        nav={isCompact || !query ? nav : null}
        search={search}
        searchOverlayOpen={overlayOpen}
        subsections={
          !showRecent && activeDomain.subsections.length > 1 ? (
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
        {showRecent ? (
          <SettingsRecentlyChanged />
        ) : (
          <TabsContent
            value={activeDomain.id}
            className="ll:mt-0 ll:flex ll:flex-col ll:gap-[var(--ll-settings-space-lg)]"
          >
            {SETTINGS_CONTENT[selectedSubsection]()}
          </TabsContent>
        )}
      </SettingsWindowShell>
    </Tabs>
  );
};
