import type { ComponentType } from "react";
import { ThemePreviewComponentsScenario } from "./theme-preview-components-scenario";
import { ThemePreviewDashboardScenario } from "./theme-preview-dashboard-scenario";
import { ThemePreviewLootsScenario } from "./theme-preview-loots-scenario";
import { ThemePreviewStatesScenario } from "./theme-preview-states-scenario";
import type {
  ThemePreviewContext,
  ThemePreviewNavigationKey,
  ThemePreviewScenario,
  ThemePreviewViewport,
} from "./theme-builder-preview-types";

interface ThemePreviewScenarioDefinition {
  activeNavigation: ThemePreviewNavigationKey;
  Component: ComponentType<{ viewport: ThemePreviewViewport }>;
  context: ThemePreviewContext;
  titleKey: string;
}

const THEME_PREVIEW_SCENARIO_REGISTRY = {
  dashboard: {
    activeNavigation: "dashboard",
    Component: ThemePreviewDashboardScenario,
    context: "user",
    titleKey: "layout.navigation.dashboard",
  },
  loots: {
    activeNavigation: "lootlog",
    Component: ThemePreviewLootsScenario,
    context: "guild",
    titleKey: "settings.appearance.preview.scenarioTitles.loots",
  },
  components: {
    activeNavigation: "settings",
    Component: ThemePreviewComponentsScenario,
    context: "user",
    titleKey: "settings.appearance.preview.scenarioTitles.components",
  },
  states: {
    activeNavigation: "notifications",
    Component: ThemePreviewStatesScenario,
    context: "user",
    titleKey: "settings.appearance.preview.scenarioTitles.states",
  },
} satisfies Record<ThemePreviewScenario, ThemePreviewScenarioDefinition>;

export const getThemePreviewScenarioDefinition = (
  scenario: ThemePreviewScenario,
) => THEME_PREVIEW_SCENARIO_REGISTRY[scenario];
