import {
  ThemeSelectionSchema,
  normalizeThemeConfigV1,
  type ThemeConfigV1,
  type ThemeSelection,
} from "@lootlog/types";

export const THEME_SNAPSHOT_STORAGE_KEY = "lootlog:active-theme:v1";

export const THEME_TOKEN_PROPERTIES = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  sidebar: "--sidebar",
  sidebarForeground: "--sidebar-foreground",
  sidebarPrimary: "--sidebar-primary",
  sidebarPrimaryForeground: "--sidebar-primary-foreground",
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarBorder: "--sidebar-border",
  sidebarRing: "--sidebar-ring",
  signalLive: "--signal-live",
  signalReady: "--signal-ready",
  signalTimer: "--signal-timer",
  signalAlert: "--signal-alert",
  primaryHover: "--primary-hover",
  primaryActive: "--primary-active",
  secondaryHover: "--secondary-hover",
  secondaryActive: "--secondary-active",
  neutralHover: "--neutral-hover",
  neutralActive: "--neutral-active",
  destructiveHover: "--destructive-hover",
  destructiveActive: "--destructive-active",
  surfaceHover: "--surface-hover",
  surfaceSelected: "--surface-selected",
  inputHover: "--input-hover",
  inputFocus: "--input-focus",
  sidebarHover: "--sidebar-hover",
  sidebarActive: "--sidebar-active",
  shadow: "--theme-shadow",
} as const;

const RADIUS_VALUES = {
  sharp: "0.25rem",
  compact: "0.5rem",
  default: "0.75rem",
  round: "1rem",
} as const;

const FONT_VALUES = {
  geist: '"Geist", ui-sans-serif, system-ui, sans-serif',
  inter: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
  manrope:
    '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif',
} as const;

const HEADING_WEIGHT_VALUES = {
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

const BODY_WEIGHT_VALUES = {
  regular: "400",
  medium: "500",
} as const;

const TRACKING_VALUES = {
  tight: "-0.02em",
  normal: "0em",
  relaxed: "0.02em",
} as const;

const DENSITY_VALUES = {
  compact: {
    controlHeight: "2rem",
    panelGap: "0.75rem",
    panelPadding: "0.875rem",
  },
  standard: {
    controlHeight: "2.25rem",
    panelGap: "1rem",
    panelPadding: "1.25rem",
  },
  comfortable: {
    controlHeight: "2.5rem",
    panelGap: "1.25rem",
    panelPadding: "1.5rem",
  },
} as const;

const CHART_GRID_OPACITY = {
  hidden: "0",
  subtle: "0.28",
  strong: "0.68",
} as const;

const CHART_STROKE_WIDTH = {
  thin: "1",
  default: "2",
  bold: "3",
} as const;

const CHART_FILL_OPACITY = {
  none: "0",
  soft: "0.2",
} as const;

export const THEME_DERIVED_PROPERTIES = [
  "--theme-control-height",
  "--theme-panel-gap",
  "--theme-panel-padding",
  "--theme-card-background",
  "--theme-card-border-color",
  "--theme-card-border-width",
  "--theme-card-shadow",
  "--theme-card-transform",
  "--theme-button-background",
  "--theme-button-foreground",
  "--theme-button-border-color",
  "--theme-button-border-width",
  "--theme-button-hover",
  "--theme-button-active",
  "--theme-button-focus-shadow",
  "--theme-input-background",
  "--theme-input-border-color",
  "--theme-input-border-width",
  "--theme-input-border-radius",
  "--theme-input-shadow",
  "--theme-badge-background",
  "--theme-badge-foreground",
  "--theme-badge-border-color",
  "--theme-table-border-collapse",
  "--theme-table-border-spacing",
  "--theme-table-row-background",
  "--theme-table-row-even-background",
  "--theme-table-row-border-color",
  "--theme-navigation-background",
  "--theme-navigation-active-background",
  "--theme-navigation-active-radius",
  "--theme-navigation-active-shadow",
  "--theme-chart-grid-opacity",
  "--theme-chart-stroke-width",
  "--theme-chart-fill-opacity",
  "--theme-quiet-animation-duration",
  "--theme-quiet-animation-iteration-count",
  "--theme-quiet-transition-duration",
  "--theme-expressive-transition-duration",
  "--theme-expressive-transition-timing",
] as const;

const getDerivedThemeProperties = (config: ThemeConfigV1) => {
  const density = DENSITY_VALUES[config.density];
  const properties: Record<string, string> = {
    "--theme-control-height": density.controlHeight,
    "--theme-panel-gap": density.panelGap,
    "--theme-panel-padding": density.panelPadding,
    "--theme-card-background":
      config.components.card === "soft" ? "var(--secondary)" : "var(--card)",
    "--theme-card-border-color":
      config.components.card === "outline" ? "var(--border)" : "transparent",
    "--theme-card-border-width": config.border === "strong" ? "2px" : "1px",
    "--theme-card-shadow": "none",
    "--theme-card-transform": "initial",
    "--theme-button-background": "var(--primary)",
    "--theme-button-foreground": "var(--primary-foreground)",
    "--theme-button-border-color": "transparent",
    "--theme-button-border-width": "0px",
    "--theme-button-hover": "var(--primary-hover)",
    "--theme-button-active": "var(--primary-active)",
    "--theme-button-focus-shadow":
      config.recipe === "signal"
        ? "0 0 0 1px var(--background), 0 0 0 3px var(--signal-live)"
        : "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    "--theme-input-background": "transparent",
    "--theme-input-border-color": "var(--input)",
    "--theme-input-border-width": "1px",
    "--theme-input-border-radius": "var(--radius)",
    "--theme-input-shadow": "none",
    "--theme-badge-background": "var(--primary)",
    "--theme-badge-foreground": "var(--primary-foreground)",
    "--theme-badge-border-color": "transparent",
    "--theme-table-border-collapse":
      config.components.table === "separated" ? "separate" : "collapse",
    "--theme-table-border-spacing":
      config.components.table === "separated" ? "0 0.35rem" : "0",
    "--theme-table-row-background":
      config.components.table === "separated" ? "var(--card)" : "transparent",
    "--theme-table-row-even-background": "transparent",
    "--theme-table-row-border-color":
      config.components.table === "plain" ? "transparent" : "var(--border)",
    "--theme-navigation-background": "var(--sidebar)",
    "--theme-navigation-active-background":
      config.navigation.active === "line"
        ? "transparent"
        : "var(--sidebar-active)",
    "--theme-navigation-active-radius":
      config.navigation.active === "line" ? "0" : "var(--radius)",
    "--theme-navigation-active-shadow":
      config.navigation.active === "line"
        ? "inset 2px 0 0 var(--sidebar-primary)"
        : "none",
    "--theme-chart-grid-opacity": CHART_GRID_OPACITY[config.chartStyle.grid],
    "--theme-chart-stroke-width": CHART_STROKE_WIDTH[config.chartStyle.stroke],
    "--theme-chart-fill-opacity": CHART_FILL_OPACITY[config.chartStyle.fill],
    "--theme-quiet-animation-duration":
      config.motion === "quiet" ? "0.01ms" : "initial",
    "--theme-quiet-animation-iteration-count":
      config.motion === "quiet" ? "1" : "initial",
    "--theme-quiet-transition-duration":
      config.motion === "quiet" ? "80ms" : "initial",
    "--theme-expressive-transition-duration":
      config.motion === "expressive" ? "220ms" : "initial",
    "--theme-expressive-transition-timing":
      config.motion === "expressive"
        ? "cubic-bezier(0.16, 1, 0.3, 1)"
        : "initial",
  };

  if (config.components.button === "soft") {
    properties["--theme-button-background"] = "var(--secondary)";
    properties["--theme-button-foreground"] = "var(--secondary-foreground)";
    properties["--theme-button-hover"] = "var(--secondary-hover)";
    properties["--theme-button-active"] = "var(--secondary-active)";
  } else if (config.components.button === "outline") {
    properties["--theme-button-background"] = "var(--background)";
    properties["--theme-button-foreground"] = "var(--primary)";
    properties["--theme-button-border-color"] = "var(--primary)";
    properties["--theme-button-border-width"] = "1px";
    properties["--theme-button-hover"] = "var(--surface-hover)";
    properties["--theme-button-active"] = "var(--surface-selected)";
  } else if (config.components.button === "minimal") {
    properties["--theme-button-background"] = "transparent";
    properties["--theme-button-foreground"] = "var(--primary)";
    properties["--theme-button-hover"] = "var(--neutral-hover)";
    properties["--theme-button-active"] = "var(--neutral-active)";
  }

  if (config.components.input === "filled") {
    properties["--theme-input-background"] = "var(--secondary)";
    properties["--theme-input-border-color"] = "transparent";
  } else if (config.components.input === "underline") {
    properties["--theme-input-border-width"] = "0 0 1px";
    properties["--theme-input-border-radius"] = "0";
  }

  if (config.components.badge === "soft") {
    properties["--theme-badge-background"] = "var(--secondary)";
    properties["--theme-badge-foreground"] = "var(--secondary-foreground)";
  } else if (config.components.badge === "outline") {
    properties["--theme-badge-background"] = "transparent";
    properties["--theme-badge-foreground"] = "var(--primary)";
    properties["--theme-badge-border-color"] = "var(--primary)";
  }

  if (config.components.table === "striped") {
    properties["--theme-table-row-even-background"] = "var(--secondary)";
  } else if (config.components.table === "separated") {
    properties["--theme-table-row-even-background"] = "var(--card)";
  }

  if (config.border === "none") {
    properties["--theme-card-border-color"] = "transparent";
    properties["--theme-input-border-color"] = "transparent";
    properties["--theme-badge-border-color"] = "transparent";
  } else if (config.border === "strong") {
    properties["--theme-card-border-color"] = "var(--border)";
    properties["--theme-input-border-color"] = "var(--input)";
    properties["--theme-input-border-width"] = "2px";
  }

  if (config.surface === "raised") {
    properties["--theme-card-shadow"] = "0 14px 34px -18px var(--theme-shadow)";
  } else if (config.surface === "floating") {
    properties["--theme-card-shadow"] = "0 20px 48px -20px var(--theme-shadow)";
    properties["--theme-card-transform"] = "translateY(-2px)";
  }

  return properties;
};

const DATA_ATTRIBUTES = [
  "themeRecipe",
  "themeRadius",
  "themeDensity",
  "themeSurface",
  "themeBorder",
  "themeButton",
  "themeCard",
  "themeInput",
  "themeBadge",
  "themeTable",
  "themeHeadingFont",
  "themeBodyFont",
  "themeNavigationSurface",
  "themeNavigationActive",
  "themeChartGrid",
  "themeChartStroke",
  "themeChartFill",
  "themeMotion",
] as const;

export interface ActiveThemeSnapshot {
  version: 1;
  presetId?: string;
  selection?: ThemeSelection;
  config: ThemeConfigV1;
}

export const applyThemeConfig = (
  element: HTMLElement,
  config: ThemeConfigV1,
) => {
  for (const [token, property] of Object.entries(THEME_TOKEN_PROPERTIES)) {
    element.style.setProperty(
      property,
      config.tokens[token as keyof ThemeConfigV1["tokens"]],
    );
  }
  config.charts.forEach((color, index) => {
    element.style.setProperty(`--chart-${index + 1}`, color);
  });
  element.style.setProperty("--filters-sidebar", config.tokens.sidebar);
  element.style.setProperty("--radius", RADIUS_VALUES[config.radius]);
  element.style.setProperty("--font-sans", FONT_VALUES[config.typography.body]);
  element.style.setProperty(
    "--font-heading",
    FONT_VALUES[config.typography.heading],
  );
  element.style.setProperty(
    "--font-heading-weight",
    HEADING_WEIGHT_VALUES[config.typography.headingWeight],
  );
  element.style.setProperty(
    "--font-body-weight",
    BODY_WEIGHT_VALUES[config.typography.bodyWeight],
  );
  element.style.setProperty(
    "--theme-tracking",
    TRACKING_VALUES[config.typography.tracking],
  );
  for (const [property, value] of Object.entries(
    getDerivedThemeProperties(config),
  )) {
    element.style.setProperty(property, value);
  }
  element.dataset.themeRecipe = config.recipe;
  element.dataset.themeRadius = config.radius;
  element.dataset.themeDensity = config.density;
  element.dataset.themeSurface = config.surface;
  element.dataset.themeBorder = config.border;
  element.dataset.themeButton = config.components.button;
  element.dataset.themeCard = config.components.card;
  element.dataset.themeInput = config.components.input;
  element.dataset.themeBadge = config.components.badge;
  element.dataset.themeTable = config.components.table;
  element.dataset.themeHeadingFont = config.typography.heading;
  element.dataset.themeBodyFont = config.typography.body;
  element.dataset.themeNavigationSurface = config.navigation.surface;
  element.dataset.themeNavigationActive = config.navigation.active;
  element.dataset.themeChartGrid = config.chartStyle.grid;
  element.dataset.themeChartStroke = config.chartStyle.stroke;
  element.dataset.themeChartFill = config.chartStyle.fill;
  element.dataset.themeMotion = config.motion;
};

export const clearThemeConfig = (element: HTMLElement) => {
  for (const property of Object.values(THEME_TOKEN_PROPERTIES)) {
    element.style.removeProperty(property);
  }
  for (let index = 1; index <= 5; index += 1) {
    element.style.removeProperty(`--chart-${index}`);
  }
  for (const property of [
    "--filters-sidebar",
    "--radius",
    "--font-sans",
    "--font-heading",
    "--font-heading-weight",
    "--font-body-weight",
    "--theme-tracking",
    ...THEME_DERIVED_PROPERTIES,
  ]) {
    element.style.removeProperty(property);
  }
  for (const attribute of DATA_ATTRIBUTES) {
    delete element.dataset[attribute];
  }
};

export const serializeThemeSnapshot = (snapshot: ActiveThemeSnapshot) =>
  JSON.stringify(snapshot);

export const parseThemeSnapshot = (
  value: string | null | undefined,
): ActiveThemeSnapshot | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const config = normalizeThemeConfigV1(parsed.config);
    const selection = ThemeSelectionSchema.safeParse(parsed.selection);
    if (parsed.version !== 1 || !config) return null;
    return {
      version: 1,
      ...(typeof parsed.presetId === "string"
        ? { presetId: parsed.presetId }
        : {}),
      ...(selection.success ? { selection: selection.data } : {}),
      config,
    };
  } catch {
    return null;
  }
};
