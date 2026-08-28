import { useEffect, useRef, useState } from "react";
import type { ThemeConfigV1 } from "@lootlog/types";
import {
  Link,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Button, buttonVariants } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import {
  ArrowLeft,
  Eye,
  FlaskConical,
  PanelLeft,
  RotateCcw,
  Save,
  Shuffle,
  TriangleAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "@/hooks/context/use-theme";
import { THEME_IDS, type ThemeId } from "@/themes/catalog";
import {
  createThemeTokens,
  PRESET_THEME_CONFIGS,
} from "@/themes/preset-configs";
import { getThemeContrastIssues } from "@/themes/theme-colors";
import { ThemeBuilderControls } from "./theme-builder-controls";
import { ThemeBuilderPreview } from "./theme-builder-preview";
import { ThemeBuilderShell } from "./theme-builder-shell";
import type { ThemeBuilderAxis } from "./theme-builder-types";

const INTERACTION_TOKENS = new Set<keyof ThemeConfigV1["tokens"]>([
  "primaryHover",
  "primaryActive",
  "secondaryHover",
  "secondaryActive",
  "neutralHover",
  "neutralActive",
  "destructiveHover",
  "destructiveActive",
  "surfaceHover",
  "surfaceSelected",
  "inputHover",
  "inputFocus",
  "sidebarHover",
  "sidebarActive",
  "shadow",
]);

const remixTokens = (
  current: ThemeConfigV1["tokens"],
  source: ThemeConfigV1["tokens"],
  lockedAxes: Set<ThemeBuilderAxis>,
) =>
  Object.fromEntries(
    Object.keys(current).map((token) => {
      const typedToken = token as keyof ThemeConfigV1["tokens"];
      const axis = INTERACTION_TOKENS.has(typedToken)
        ? "interactions"
        : "colors";
      return [
        typedToken,
        lockedAxes.has(axis) ? current[typedToken] : source[typedToken],
      ];
    }),
  ) as ThemeConfigV1["tokens"];

const getRemixedConfig = (
  current: ThemeConfigV1,
  source: ThemeConfigV1,
  lockedAxes: Set<ThemeBuilderAxis>,
): ThemeConfigV1 => ({
  version: 1,
  tokens: remixTokens(current.tokens, source.tokens, lockedAxes),
  recipe: lockedAxes.has("components") ? current.recipe : source.recipe,
  components: lockedAxes.has("components")
    ? current.components
    : source.components,
  radius: lockedAxes.has("surfaces") ? current.radius : source.radius,
  density: lockedAxes.has("surfaces") ? current.density : source.density,
  surface: lockedAxes.has("surfaces") ? current.surface : source.surface,
  border: lockedAxes.has("surfaces") ? current.border : source.border,
  typography: lockedAxes.has("typography")
    ? current.typography
    : source.typography,
  navigation: lockedAxes.has("navigation")
    ? current.navigation
    : source.navigation,
  charts: lockedAxes.has("charts") ? current.charts : source.charts,
  chartStyle: lockedAxes.has("charts") ? current.chartStyle : source.chartStyle,
  motion: lockedAxes.has("motion") ? current.motion : source.motion,
});

export const ThemeBuilder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ strict: false }) as { themeId?: string };
  const search = useSearch({ strict: false }) as { source?: string };
  const {
    library,
    patchLibrary,
    previewSession,
    startPreviewSession,
    stopPreviewSession,
    isLoading,
    isSaving,
  } = useTheme();
  const existingTheme = params.themeId
    ? library.customThemes.find((theme) => theme.id === params.themeId)
    : undefined;
  const sourceId =
    search.source && (THEME_IDS as readonly string[]).includes(search.source)
      ? (search.source as ThemeId)
      : "default";
  const currentBuilderPath = `${location.pathname}${location.searchStr}`;
  const resumedPreviewSession =
    previewSession?.returnTo === currentBuilderPath ? previewSession : null;
  const initialConfig =
    resumedPreviewSession?.config ??
    existingTheme?.config ??
    PRESET_THEME_CONFIGS[sourceId];
  const initialName =
    resumedPreviewSession?.name ??
    existingTheme?.name ??
    t("settings.appearance.builder.defaultName");
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<ThemeConfigV1>(() =>
    structuredClone(initialConfig),
  );
  const [originalName, setOriginalName] = useState(initialName);
  const [originalConfig, setOriginalConfig] = useState<ThemeConfigV1>(() =>
    structuredClone(initialConfig),
  );
  const [lockedAxes, setLockedAxes] = useState<Set<ThemeBuilderAxis>>(
    () => new Set(),
  );
  const [activateAfterSave, setActivateAfterSave] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPreviewFocused, setIsPreviewFocused] = useState(false);
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">(
    "settings",
  );
  const loadedThemeIdRef = useRef(existingTheme?.id);
  const allowNavigationRef = useRef(false);
  const isDirty =
    name !== originalName ||
    JSON.stringify(config) !== JSON.stringify(originalConfig);
  const contrastIssues = getThemeContrastIssues(config);
  const canSave =
    name.trim().length > 0 && contrastIssues.length === 0 && isDirty;

  useEffect(() => {
    if (!existingTheme || loadedThemeIdRef.current === existingTheme.id) return;
    loadedThemeIdRef.current = existingTheme.id;
    setName(existingTheme.name);
    setOriginalName(existingTheme.name);
    setConfig(structuredClone(existingTheme.config));
    setOriginalConfig(structuredClone(existingTheme.config));
  }, [existingTheme]);

  useBlocker({
    shouldBlockFn: () =>
      isDirty &&
      !allowNavigationRef.current &&
      !window.confirm(t("settings.appearance.builder.leaveConfirm")),
    enableBeforeUnload: isDirty,
  });

  const saveTheme = async () => {
    if (!canSave) return;
    const themeId = existingTheme?.id ?? crypto.randomUUID();
    const savedTheme = { id: themeId, name: name.trim(), config };
    try {
      await patchLibrary([
        {
          kind: "upsert",
          theme: savedTheme,
          activate: activateAfterSave,
        },
      ]);
    } catch {
      return;
    }
    setOriginalName(savedTheme.name);
    setOriginalConfig(structuredClone(config));
    toast.success(t("settings.appearance.toasts.saved"));
    if (activateAfterSave) stopPreviewSession();

    if (!existingTheme) {
      allowNavigationRef.current = true;
      await navigate({
        to: "/@me/settings/appearance/themes/$themeId",
        params: { themeId },
        replace: true,
      });
      if (previewSession && !activateAfterSave) {
        startPreviewSession({
          config: structuredClone(config),
          name: savedTheme.name,
          returnTo: `/@me/settings/appearance/themes/${themeId}`,
        });
      }
      allowNavigationRef.current = false;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const toggleLock = (axis: ThemeBuilderAxis) => {
    setLockedAxes((currentAxes) => {
      const nextAxes = new Set(currentAxes);
      if (nextAxes.has(axis)) nextAxes.delete(axis);
      else nextAxes.add(axis);
      return nextAxes;
    });
  };

  const remix = () => {
    const availableSources = Object.values(PRESET_THEME_CONFIGS);
    const randomSource =
      availableSources[Math.floor(Math.random() * availableSources.length)] ??
      PRESET_THEME_CONFIGS.default;
    setConfig((current) => getRemixedConfig(current, randomSource, lockedAxes));
  };

  const reset = () => {
    setName(originalName);
    setConfig(structuredClone(originalConfig));
  };

  const tryInApplication = async () => {
    startPreviewSession({
      config: structuredClone(config),
      name: name.trim() || t("settings.appearance.builder.defaultName"),
      returnTo: currentBuilderPath,
    });
    allowNavigationRef.current = true;
    await navigate({ to: "/@me" });
    allowNavigationRef.current = false;
  };

  const resetGroup = (axis: ThemeBuilderAxis) => {
    setConfig((current) => {
      if (axis === "colors" || axis === "interactions") {
        const tokens = { ...current.tokens };
        for (const token of Object.keys(tokens) as (keyof typeof tokens)[]) {
          const tokenAxis = INTERACTION_TOKENS.has(token)
            ? "interactions"
            : "colors";
          if (tokenAxis === axis) tokens[token] = originalConfig.tokens[token];
        }
        return { ...current, tokens };
      }
      if (axis === "components") {
        return {
          ...current,
          recipe: originalConfig.recipe,
          components: structuredClone(originalConfig.components),
        };
      }
      if (axis === "surfaces") {
        return {
          ...current,
          radius: originalConfig.radius,
          density: originalConfig.density,
          surface: originalConfig.surface,
          border: originalConfig.border,
        };
      }
      if (axis === "typography") {
        return {
          ...current,
          typography: structuredClone(originalConfig.typography),
        };
      }
      if (axis === "navigation") {
        return {
          ...current,
          navigation: structuredClone(originalConfig.navigation),
        };
      }
      if (axis === "charts") {
        return {
          ...current,
          charts: structuredClone(originalConfig.charts),
          chartStyle: structuredClone(originalConfig.chartStyle),
        };
      }
      return { ...current, motion: originalConfig.motion };
    });
  };

  const generatePalette = () => {
    setConfig((current) => ({
      ...current,
      tokens: createThemeTokens({
        background: current.tokens.background,
        primary: current.tokens.primary,
        accent: current.tokens.accent,
        signal: current.tokens.signalReady,
      }),
    }));
  };

  if (isLoading && params.themeId && !existingTheme) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (params.themeId && !existingTheme) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>
            {t("settings.appearance.builder.notFoundTitle")}
          </AlertTitle>
          <AlertDescription>
            {t("settings.appearance.builder.notFoundDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ThemeBuilderShell>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/@me/settings/appearance"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-11 sm:size-10",
              )}
              aria-label={t("settings.appearance.builder.back")}
            >
              <ArrowLeft />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                {existingTheme
                  ? t("settings.appearance.builder.editTitle")
                  : t("settings.appearance.builder.createTitle")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.builder.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={reset}
              disabled={!isDirty}
            >
              <RotateCcw />
              {t("settings.appearance.builder.reset")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={remix}
            >
              <Shuffle />
              {t("settings.appearance.builder.remix")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => void tryInApplication()}
            >
              <FlaskConical />
              {t("settings.appearance.builder.tryInApplication")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => void saveTheme()}
              disabled={!canSave || isSaving}
            >
              <Save />
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </header>

        <div className="flex border-b border-border p-2 xl:hidden">
          <Button
            type="button"
            variant={mobileTab === "settings" ? "secondary" : "ghost"}
            className="min-h-11 flex-1"
            onClick={() => setMobileTab("settings")}
            aria-pressed={mobileTab === "settings"}
          >
            <PanelLeft />
            {t("settings.appearance.builder.settingsTab")}
          </Button>
          <Button
            type="button"
            variant={mobileTab === "preview" ? "secondary" : "ghost"}
            className="min-h-11 flex-1"
            onClick={() => setMobileTab("preview")}
            aria-pressed={mobileTab === "preview"}
          >
            <Eye />
            {t("settings.appearance.builder.previewTab")}
          </Button>
        </div>

        <div
          className={cn(
            "grid min-h-0 flex-1",
            isPreviewFocused
              ? "xl:grid-cols-[minmax(0,1fr)]"
              : "xl:grid-cols-[410px_minmax(0,1fr)]",
          )}
        >
          <aside
            className={cn(
              "min-h-0 border-r border-border bg-card",
              mobileTab !== "settings" && "hidden xl:block",
              isPreviewFocused && "xl:hidden",
            )}
          >
            <ScrollArea className="h-full">
              <div className="p-4">
                <ThemeBuilderControls
                  name={name}
                  config={config}
                  lockedAxes={lockedAxes}
                  onNameChange={setName}
                  onConfigChange={setConfig}
                  onGeneratePalette={generatePalette}
                  onResetGroup={resetGroup}
                  onToggleLock={toggleLock}
                />
              </div>
            </ScrollArea>
          </aside>

          <section
            className={cn(
              "min-h-0 overflow-hidden bg-[#0b1019] p-2 sm:p-3",
              mobileTab !== "preview" && "hidden xl:block",
            )}
          >
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    variant={!showOriginal ? "secondary" : "ghost"}
                    onClick={() => setShowOriginal(false)}
                    aria-pressed={!showOriginal}
                  >
                    {t("settings.appearance.builder.after")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    variant={showOriginal ? "secondary" : "ghost"}
                    onClick={() => setShowOriginal(true)}
                    aria-pressed={showOriginal}
                  >
                    {t("settings.appearance.builder.before")}
                  </Button>
                </div>
                <div className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    id="activate-theme-after-save"
                    checked={activateAfterSave}
                    onCheckedChange={(checked) =>
                      setActivateAfterSave(checked === true)
                    }
                  />
                  <Label
                    htmlFor="activate-theme-after-save"
                    className="cursor-pointer"
                  >
                    {t("settings.appearance.builder.activateAfterSave")}
                  </Label>
                </div>
              </div>

              {contrastIssues.length > 0 ? (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>
                    {t("settings.appearance.builder.contrastTitle")}
                  </AlertTitle>
                  <AlertDescription>
                    {t("settings.appearance.builder.contrastDescription", {
                      count: contrastIssues.length,
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="min-h-0 flex-1">
                <ThemeBuilderPreview
                  config={showOriginal ? originalConfig : config}
                  focused={isPreviewFocused}
                  label={t("settings.appearance.builder.previewLabel")}
                  onFocusedChange={setIsPreviewFocused}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </ThemeBuilderShell>
  );
};
