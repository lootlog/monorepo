import { useLayoutEffect, useRef, useState } from "react";
import type { ThemeConfigV1 } from "@lootlog/types";
import { PortalContainerProvider } from "@lootlog/ui/components/portal-container-provider";
import { useTranslation } from "react-i18next";
import { applyThemeConfig, clearThemeConfig } from "@/themes/runtime";
import { ThemeBuilderPreviewInspector } from "./theme-builder-preview-inspector";
import { ThemeBuilderPreviewShell } from "./theme-builder-preview-shell";
import { ThemeBuilderPreviewToolbar } from "./theme-builder-preview-toolbar";
import type {
  ThemePreviewInspection,
  ThemePreviewScenario,
  ThemePreviewViewport,
  ThemePreviewZoom,
} from "./theme-builder-preview-types";
import { getThemePreviewScenarioDefinition } from "./theme-preview-scenario-registry";

interface ThemeBuilderPreviewProps {
  config: ThemeConfigV1;
  focused: boolean;
  label: string;
  onFocusedChange: (focused: boolean) => void;
}

const VIEWPORT_SIZES = {
  desktop: { height: 900, width: 1440 },
  tablet: { height: 1024, width: 768 },
  mobile: { height: 844, width: 390 },
} as const;

const SLOT_TOKENS: Record<string, string[]> = {
  button: [
    "primary",
    "primaryForeground",
    "primaryHover",
    "primaryActive",
    "ring",
  ],
  badge: ["primary", "primaryForeground", "primaryHover", "primaryActive"],
  card: [
    "card",
    "cardForeground",
    "border",
    "surfaceHover",
    "surfaceSelected",
    "shadow",
  ],
  input: [
    "background",
    "foreground",
    "input",
    "inputHover",
    "inputFocus",
    "ring",
  ],
  "select-trigger": [
    "background",
    "foreground",
    "input",
    "inputHover",
    "inputFocus",
  ],
  "select-content": ["popover", "popoverForeground", "border", "shadow"],
  "table-row": ["card", "surfaceHover", "surfaceSelected", "border"],
  "dialog-content": ["background", "foreground", "border", "shadow"],
  "popover-content": ["popover", "popoverForeground", "border", "shadow"],
  "dropdown-menu-content": [
    "popover",
    "popoverForeground",
    "surfaceHover",
    "surfaceSelected",
  ],
  "tooltip-content": ["popover", "popoverForeground", "border"],
  "preview-app-shell": ["background", "foreground", "border"],
  "preview-world-rail": [
    "sidebar",
    "sidebarForeground",
    "sidebarHover",
    "sidebarActive",
  ],
  "preview-sidebar-navigation": [
    "sidebar",
    "sidebarForeground",
    "sidebarHover",
    "sidebarActive",
  ],
  "preview-navigation-item": [
    "sidebarForeground",
    "sidebarHover",
    "sidebarActive",
    "sidebarPrimary",
  ],
  "preview-page-header": ["background", "foreground", "border"],
  "preview-page-content": ["background", "foreground", "card"],
  "dashboard-statistics-panel": ["card", "cardForeground", "border"],
  "preview-loot-card": ["card", "cardForeground", "border", "surfaceHover"],
  "preview-loot-filters": ["card", "input", "inputHover", "inputFocus"],
};

export const ThemeBuilderPreview = ({
  config,
  focused,
  label,
  onFocusedChange,
}: ThemeBuilderPreviewProps) => {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [scenario, setScenario] = useState<ThemePreviewScenario>("dashboard");
  const [viewport, setViewport] = useState<ThemePreviewViewport>("desktop");
  const [zoom, setZoom] = useState<ThemePreviewZoom>("fit");
  const [inspecting, setInspecting] = useState(false);
  const [inspection, setInspection] = useState<ThemePreviewInspection | null>(
    null,
  );
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;
    setPortalContainer(preview);
    applyThemeConfig(preview, config);
    return () => clearThemeConfig(preview);
  }, [config]);

  useLayoutEffect(() => {
    const canvasArea = canvasAreaRef.current;
    if (!canvasArea) return undefined;

    const updateFitScale = () => {
      const availableWidth = Math.max(0, canvasArea.clientWidth - 40);
      setFitScale(
        Math.min(
          1,
          Math.max(0.25, availableWidth / VIEWPORT_SIZES[viewport].width),
        ),
      );
    };

    updateFitScale();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(updateFitScale);
    observer.observe(canvasArea);
    return () => observer.disconnect();
  }, [viewport]);

  const inspectTarget = (target: EventTarget | null) => {
    if (!inspecting || !(target instanceof HTMLElement)) return;
    const slottedElement = target.closest<HTMLElement>("[data-slot]");
    if (!slottedElement || !previewRef.current?.contains(slottedElement))
      return;
    const slot = slottedElement.dataset.slot;
    if (!slot) return;
    setInspection({
      slot,
      tokens: SLOT_TOKENS[slot] ?? ["background", "foreground", "border"],
    });
  };

  const viewportSize = VIEWPORT_SIZES[viewport];
  const zoomValue = zoom === "fit" ? fitScale : zoom === "75" ? 0.75 : 1;
  const scenarioDefinition = getThemePreviewScenarioDefinition(scenario);
  const Scenario = scenarioDefinition.Component;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#293245] bg-[#0b1019] shadow-2xl">
      <ThemeBuilderPreviewToolbar
        scenario={scenario}
        viewport={viewport}
        zoom={zoom}
        focused={focused}
        inspecting={inspecting}
        onScenarioChange={setScenario}
        onViewportChange={setViewport}
        onZoomChange={setZoom}
        onFocusedChange={onFocusedChange}
        onInspectingChange={(value) => {
          setInspecting(value);
          if (!value) setInspection(null);
        }}
      />
      <div
        ref={canvasAreaRef}
        className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-5"
      >
        <div
          className="mx-auto origin-top-left"
          style={{
            height: viewportSize.height,
            width: viewportSize.width,
            zoom: zoomValue,
          }}
        >
          <div
            ref={previewRef}
            className="theme-preview relative h-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl"
            aria-label={label}
            data-inspecting={inspecting || undefined}
            data-preview-viewport={viewport}
            onClickCapture={(event) => inspectTarget(event.target)}
          >
            <PortalContainerProvider container={portalContainer}>
              <ThemeBuilderPreviewShell
                activeNavigation={scenarioDefinition.activeNavigation}
                context={scenarioDefinition.context}
                title={t(scenarioDefinition.titleKey)}
                viewport={viewport}
              >
                <Scenario key={viewport} viewport={viewport} />
              </ThemeBuilderPreviewShell>
            </PortalContainerProvider>
            {inspection ? (
              <ThemeBuilderPreviewInspector
                inspection={inspection}
                onClose={() => setInspection(null)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
