import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BattlePanelSettingsTab } from "@/features/settings/components/battle-panel/battle-panel-settings-tab";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { ChatAppearanceSettingsForm } from "@/features/settings/components/chat/chat-appearance-settings";
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
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsColors } from "@/features/settings/components/timers/timers-settings-colors";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";
import {
  resolveSettingsPath,
  type SettingsDomainValue,
  type SettingsSubsectionValue,
} from "@/features/settings/constants/settings-tabs";
import { SETTINGS_MANIFEST } from "@/features/settings/settings-manifest";
import {
  searchSettings,
  type SettingsSearchItem,
} from "@/features/settings/settings-search";
import { useWindowsStore } from "@/store/windows.store";
import {
  Activity,
  Bell,
  Clock,
  Database,
  Info,
  Keyboard,
  Palette,
  Search,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const ICONS: Record<string, LucideIcon> = {
  settings: Settings,
  palette: Palette,
  clock: Clock,
  database: Database,
  bell: Bell,
  keyboard: Keyboard,
  activity: Activity,
  info: Info,
};

const COMPACT_WIDTH = 600;

export const SettingsTabs = () => {
  const { t } = useTranslation();
  const activeTab = useWindowsStore((state) => state.settings.state?.activeTab);
  const activeSubsection = useWindowsStore(
    (state) => state.settings.state?.activeSubsection,
  );
  const settingsWidth = useWindowsStore((state) => state.settings.size.width);
  const setSettingsPath = useWindowsStore((state) => state.setSettingsPath);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [compactPanelOpen, setCompactPanelOpen] = useState(false);
  const path = resolveSettingsPath(activeTab, activeSubsection);
  const visibleDomains = SETTINGS_MANIFEST.map((domain) => ({
    ...domain,
    subsections: domain.subsections.filter(
      (subsection) => subsection.visible?.() ?? true,
    ),
  }));
  const activeDomain =
    visibleDomains.find((domain) => domain.id === path.domain) ??
    visibleDomains[0];
  const selectedSubsection = activeDomain.subsections.some(
    (subsection) => subsection.id === path.subsection,
  )
    ? path.subsection
    : activeDomain.subsections[0].id;
  const searchItems: SettingsSearchItem[] = visibleDomains.flatMap(
    (domain, domainIndex) =>
      domain.subsections.flatMap((subsection, subsectionIndex) =>
        subsection.controls.map((control, controlIndex) => ({
          categoryId: domain.id,
          categoryLabel: t(domain.labelKey),
          subsectionId: subsection.id,
          subsectionLabel: t(subsection.labelKey),
          controlId: control.id,
          label: t(control.labelKey),
          description: control.descriptionKey
            ? t(control.descriptionKey)
            : undefined,
          keywords: control.aliases,
          order: domainIndex * 10_000 + subsectionIndex * 100 + controlIndex,
        })),
      ),
  );
  const results = searchSettings(searchItems, query);
  const isCompact = settingsWidth < COMPACT_WIDTH;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setCompactPanelOpen(true);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [query]);

  useEffect(() => {
    if (compactPanelOpen) {
      searchInputRef.current?.focus();
    }
  }, [compactPanelOpen]);

  const openSearchResult = (result: SettingsSearchItem) => {
    setSettingsPath(
      result.categoryId as SettingsDomainValue,
      result.subsectionId as SettingsSubsectionValue,
    );
    setCompactPanelOpen(false);

    window.setTimeout(() => {
      const exactControl = document.getElementById(result.controlId);
      const control =
        exactControl?.closest<HTMLElement>("[data-settings-control]") ??
        exactControl ??
        document.getElementById(`settings-subsection-${result.subsectionId}`);
      control?.scrollIntoView({ behavior: "smooth", block: "center" });
      control?.setAttribute("data-settings-highlighted", "true");
      window.setTimeout(
        () => control?.removeAttribute("data-settings-highlighted"),
        1800,
      );
    });
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setCompactPanelOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedResultIndex((currentIndex) =>
        Math.min(currentIndex + 1, Math.max(results.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedResultIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === "Enter" && results[selectedResultIndex]) {
      event.preventDefault();
      openSearchResult(results[selectedResultIndex]);
    }
  };

  let content: ReactNode;

  switch (selectedSubsection) {
    case "behavior":
      content = <GeneralSettingsTab />;
      break;
    case "chat":
      content = <ChatAppearanceSettingsForm />;
      break;
    case "timer-appearance":
      content = <TimersSettingsAppearance />;
      break;
    case "timer-colors":
      content = <TimersSettingsColors />;
      break;
    case "timer-behavior":
      content = <TimersSettingsGeneral />;
      break;
    case "hidden-timers":
      content = <HiddenTimersTab />;
      break;
    case "catching":
      content = <CatchingSettings />;
      break;
    case "detector":
      content = <DetectorSettingsTab />;
      break;
    case "battle-panel":
      content = <BattlePanelSettingsTab />;
      break;
    case "notification-rules":
      content = <NotificationsSettingsTab />;
      break;
    case "notification-mutes":
      content = <NotificationMutesSettingsTab />;
      break;
    case "sounds":
      content = <SoundsSettingsTab />;
      break;
    case "hotkeys":
      content = <HotkeysSettingsTab />;
      break;
    case "logs":
      content = <LogsSettingsTab />;
      break;
    case "debug":
      content = <DebugTab />;
      break;
    case "build":
      content = <InformationSettingsTab />;
      break;
    default:
      content = <GeneralSettingsTab />;
  }

  const navigationPanel = (
    <div className="ll:flex ll:h-full ll:min-h-0 ll:w-48 ll:flex-col ll:border-0 ll:border-r ll:border-solid ll:border-gray-500/30 ll:bg-black/15 ll:p-2">
      <div className="ll:relative ll:mb-2">
        <Search className="ll:pointer-events-none ll:absolute ll:left-2 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:text-gray-400" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t("settings.search.placeholder")}
          aria-label={t("settings.search.ariaLabel")}
          className="ll:h-7 ll:w-full ll:box-border ll:rounded-md ll:border ll:border-solid ll:border-gray-500 ll:bg-black/25 ll:pl-7 ll:pr-7 ll:text-xs ll:text-white ll:outline-none ll:focus:border-purple-400"
        />
        {query ? (
          <button
            type="button"
            aria-label={t("settings.search.clear")}
            onClick={() => setQuery("")}
            className="ll:absolute ll:right-1.5 ll:top-1/2 ll:flex ll:size-5 ll:-translate-y-1/2 ll:items-center ll:justify-center ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-400 ll-custom-cursor-pointer"
          >
            <X className="ll:size-3.5" />
          </button>
        ) : null}
      </div>
      <ScrollArea className="ll:min-h-0 ll:flex-1">
        {query ? (
          <div
            role="listbox"
            aria-label={t("settings.search.results")}
            className="ll:flex ll:flex-col ll:gap-0.5"
          >
            {results.length === 0 ? (
              <p className="ll:m-0 ll:px-2 ll:py-3 ll:text-[11px] ll:text-gray-400">
                {t("settings.search.empty")}
              </p>
            ) : null}
            {results.map((result, index) => {
              const previousResult = results[index - 1];
              const startsDomain =
                !previousResult ||
                previousResult.categoryId !== result.categoryId;
              const startsSubsection =
                startsDomain ||
                previousResult.subsectionId !== result.subsectionId;

              return (
                <div key={result.controlId}>
                  {startsDomain ? (
                    <div className="ll:mt-2 ll:px-2 ll:text-[10px] ll:font-semibold ll:uppercase ll:text-gray-400">
                      {result.categoryLabel}
                    </div>
                  ) : null}
                  {startsSubsection ? (
                    <div className="ll:px-2 ll:pt-1 ll:text-[11px] ll:font-semibold ll:text-gray-200">
                      {result.subsectionLabel}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === selectedResultIndex}
                    onMouseEnter={() => setSelectedResultIndex(index)}
                    onClick={() => openSearchResult(result)}
                    className="ll:mt-0.5 ll:w-full ll:rounded-md ll:border-0 ll:bg-transparent ll:px-3 ll:py-1.5 ll:text-left ll:text-[11px] ll:text-gray-300 ll-custom-cursor-pointer ll:hover:bg-purple-500/15 ll:aria-selected:bg-purple-500/25 ll:aria-selected:text-white"
                  >
                    {result.label}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <TabsList className="ll:flex ll:w-full ll:flex-col ll:items-stretch ll:gap-1">
            {visibleDomains.map((domain) => {
              const Icon = ICONS[domain.icon];
              return (
                <TabsTrigger
                  key={domain.id}
                  value={domain.id}
                  className="ll:mt-0 ll:flex ll:min-h-8 ll:w-full ll:items-center ll:justify-start ll:gap-2 ll:rounded-md ll:border-transparent ll:px-2 ll:py-1.5 ll:text-left ll:font-semibold ll:text-gray-300 ll:hover:bg-gray-500/20 ll:data-[active]:border-purple-400/70 ll:data-[active]:bg-purple-500/20 ll:data-[active]:text-white"
                >
                  <Icon className="ll:size-4 ll:shrink-0" />
                  <span>{t(domain.labelKey)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <Tabs
      value={activeDomain.id}
      onValueChange={(domainId) => {
        const domain = visibleDomains.find(({ id }) => id === domainId);
        if (domain) {
          setSettingsPath(domain.id, domain.subsections[0].id);
        }
      }}
      className="ll:relative ll:flex ll:h-full ll:min-h-0 ll:w-full ll:flex-row ll:gap-0 ll:pt-2"
    >
      {isCompact ? (
        <>
          <div className="ll:flex ll:h-full ll:w-12 ll:shrink-0 ll:flex-col ll:items-center ll:gap-1 ll:border-0 ll:border-r ll:border-solid ll:border-gray-500/30 ll:bg-black/15 ll:px-1">
            <button
              type="button"
              aria-label={t("settings.search.ariaLabel")}
              onClick={() => {
                setCompactPanelOpen(true);
                window.setTimeout(() => searchInputRef.current?.focus());
              }}
              className="ll:flex ll:size-8 ll:items-center ll:justify-center ll:rounded-md ll:border ll:border-gray-500/40 ll:bg-transparent ll:text-gray-300 ll-custom-cursor-pointer"
            >
              <Search className="ll:size-4" />
            </button>
            {visibleDomains.map((domain) => {
              const Icon = ICONS[domain.icon];
              return (
                <button
                  key={domain.id}
                  type="button"
                  aria-label={t(domain.labelKey)}
                  aria-current={domain.id === activeDomain.id}
                  onClick={() =>
                    setSettingsPath(domain.id, domain.subsections[0].id)
                  }
                  className="ll:flex ll:size-8 ll:items-center ll:justify-center ll:rounded-md ll:border ll:border-gray-500/40 ll:bg-transparent ll:text-gray-300 ll-custom-cursor-pointer ll:aria-current:border-purple-400 ll:aria-current:bg-purple-500/25 ll:aria-current:text-white"
                >
                  <Icon className="ll:size-4" />
                </button>
              );
            })}
          </div>
          {compactPanelOpen ? (
            <div className="ll:absolute ll:inset-y-2 ll:left-12 ll:z-30 ll:shadow-2xl">
              {navigationPanel}
            </div>
          ) : null}
        </>
      ) : (
        navigationPanel
      )}
      <div className="ll:flex ll:min-h-0 ll:min-w-0 ll:flex-1 ll:flex-col ll:px-3">
        <div className="ll:mb-2 ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:border-0 ll:border-b ll:border-solid ll:border-gray-500/30 ll:pb-2">
          {activeDomain.subsections.map((subsection) => (
            <button
              key={subsection.id}
              type="button"
              aria-current={subsection.id === selectedSubsection}
              onClick={() => setSettingsPath(activeDomain.id, subsection.id)}
              className="ll:rounded-md ll:border ll:border-transparent ll:bg-transparent ll:px-2.5 ll:py-1.5 ll:text-[11px] ll:font-semibold ll:text-gray-400 ll-custom-cursor-pointer ll:hover:bg-gray-500/15 ll:aria-current:border-purple-400/60 ll:aria-current:bg-purple-500/20 ll:aria-current:text-white"
            >
              {t(subsection.labelKey)}
            </button>
          ))}
        </div>
        <ScrollArea className="ll:min-h-0 ll:flex-1 ll:pr-2">
          {visibleDomains.map((domain) => (
            <TabsContent
              key={domain.id}
              value={domain.id}
              className="ll:mt-0 ll:pb-3"
            >
              <div
                id={`settings-subsection-${selectedSubsection}`}
                className="ll:rounded-md ll:transition-[background-color,box-shadow] ll:data-[settings-highlighted]:bg-purple-500/10 ll:data-[settings-highlighted]:shadow-[0_0_0_2px_rgba(192,132,252,0.25)]"
              >
                {content}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </div>
    </Tabs>
  );
};
