import { Button } from "@lootlog/ui/components/button";
import {
  Maximize2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  SearchCode,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ThemePreviewScenario,
  ThemePreviewViewport,
  ThemePreviewZoom,
} from "./theme-builder-preview-types";

interface ThemeBuilderPreviewToolbarProps {
  focused: boolean;
  inspecting: boolean;
  scenario: ThemePreviewScenario;
  viewport: ThemePreviewViewport;
  zoom: ThemePreviewZoom;
  onFocusedChange: (focused: boolean) => void;
  onInspectingChange: (inspecting: boolean) => void;
  onScenarioChange: (scenario: ThemePreviewScenario) => void;
  onViewportChange: (viewport: ThemePreviewViewport) => void;
  onZoomChange: (zoom: ThemePreviewZoom) => void;
}

const SCENARIOS = ["dashboard", "loots", "components", "states"] as const;
const VIEWPORTS = [
  { value: "desktop", Icon: Monitor },
  { value: "tablet", Icon: Tablet },
  { value: "mobile", Icon: Smartphone },
] as const;
const ZOOMS = ["fit", "75", "100"] as const;

export const ThemeBuilderPreviewToolbar = ({
  focused,
  inspecting,
  scenario,
  viewport,
  zoom,
  onFocusedChange,
  onInspectingChange,
  onScenarioChange,
  onViewportChange,
  onZoomChange,
}: ThemeBuilderPreviewToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#293245] bg-[#111723] p-2 text-[#f4f6fb]">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {SCENARIOS.map((value) => (
          <button
            key={value}
            type="button"
            className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-medium text-[#aeb9cb] transition-colors hover:bg-[#252e3e] hover:text-[#f4f6fb] aria-pressed:bg-[#2e68ff] aria-pressed:text-[#f4f6fb]"
            aria-pressed={scenario === value}
            onClick={() => onScenarioChange(value)}
          >
            {t(`settings.appearance.preview.scenarios.${value}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 text-[#aeb9cb] hover:bg-[#252e3e] hover:text-[#f4f6fb]"
          aria-label={t(
            focused
              ? "settings.appearance.preview.restoreSettings"
              : "settings.appearance.preview.focusPreview",
          )}
          aria-pressed={focused}
          onClick={() => onFocusedChange(!focused)}
        >
          {focused ? <PanelLeftOpen /> : <PanelLeftClose />}
          <span className="hidden 2xl:inline">
            {t(
              focused
                ? "settings.appearance.preview.restoreSettings"
                : "settings.appearance.preview.focusPreview",
            )}
          </span>
        </Button>
        <div className="mx-1 h-5 w-px bg-[#364055]" />
        {VIEWPORTS.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            className="grid size-9 place-items-center rounded-lg text-[#aeb9cb] hover:bg-[#252e3e] hover:text-[#f4f6fb] aria-pressed:bg-[#252e3e] aria-pressed:text-[#f4f6fb]"
            aria-label={t(`settings.appearance.preview.viewports.${value}`)}
            aria-pressed={viewport === value}
            onClick={() => onViewportChange(value)}
          >
            <Icon className="size-4" />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-[#364055]" />
        {ZOOMS.map((value) => (
          <button
            key={value}
            type="button"
            className="min-h-9 rounded-lg px-2 text-[11px] font-medium text-[#aeb9cb] hover:bg-[#252e3e] hover:text-[#f4f6fb] aria-pressed:bg-[#252e3e] aria-pressed:text-[#f4f6fb]"
            aria-pressed={zoom === value}
            onClick={() => onZoomChange(value)}
          >
            {value === "fit" ? <Maximize2 className="size-4" /> : `${value}%`}
          </button>
        ))}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9 text-[#aeb9cb] hover:bg-[#252e3e] hover:text-[#f4f6fb]"
          aria-label={t("settings.appearance.preview.inspector")}
          aria-pressed={inspecting}
          onClick={() => onInspectingChange(!inspecting)}
        >
          <SearchCode />
        </Button>
      </div>
    </div>
  );
};
