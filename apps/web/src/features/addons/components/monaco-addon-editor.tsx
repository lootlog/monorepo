import type { AddonTypeBundle } from "@/features/addons/types";
import {
  DEFAULT_MONACO_ADDON_THEME,
  type MonacoAddonThemeId,
} from "@/features/addons/monaco-addon-themes";
import Editor, {
  loader,
  type BeforeMount,
  type OnMount,
} from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api.js";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js";
import * as monacoTypescriptContribution from "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

type MonacoAddonEditorProps = {
  value: string;
  language: "typescript" | "javascript";
  onChange: (value: string) => void;
  onSaveShortcut?: () => void | Promise<void>;
  typeBundle?: AddonTypeBundle;
  disabled?: boolean;
  height?: string;
  theme?: MonacoAddonThemeId;
};

let isCustomThemeRegistered = false;

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
    __LOOTLOG_MONACO_DEBUG__?: boolean;
  }
}

if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

loader.config({ monaco: monacoEditor });

const MONACO_DEBUG_PREFIX = "[AddonMonaco]";

const isMonacoDebugEnabled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.__LOOTLOG_MONACO_DEBUG__ === true) {
    return true;
  }

  if (window.__LOOTLOG_MONACO_DEBUG__ === false) {
    return false;
  }

  try {
    if (window.localStorage.getItem("lootlog:addon-monaco-debug") === "1") {
      return true;
    }
  } catch {
    // ignore localStorage failures in strict environments
  }

  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has("addonMonacoDebug")) {
      return true;
    }
  } catch {
    // ignore URL parsing errors
  }

  return import.meta.env.DEV;
};

const debugMonaco = (...messages: unknown[]) => {
  if (!isMonacoDebugEnabled()) {
    return;
  }

  // oxlint-disable-next-line no-console
  console.debug(MONACO_DEBUG_PREFIX, ...messages);
};

const debugMonacoWarn = (...messages: unknown[]) => {
  if (!isMonacoDebugEnabled()) {
    return;
  }

  // oxlint-disable-next-line no-console
  console.warn(MONACO_DEBUG_PREFIX, ...messages);
};

type MonacoWorkerDiagnosticsApi = {
  getScriptFileNames?: () => Promise<string[]> | string[];
  getSyntacticDiagnostics?: (fileName: string) => Promise<unknown[]>;
  getSemanticDiagnostics?: (fileName: string) => Promise<unknown[]>;
  getCompilerOptionsDiagnostics?: (fileName: string) => Promise<unknown[]>;
};

const isMonacoTypescriptApi = (
  api: MonacoTypescriptApi | undefined,
): api is MonacoTypescriptApi =>
  Boolean(api?.typescriptDefaults && api?.javascriptDefaults);

const getMonacoTypescriptApis = (monaco: typeof monacoEditor) => {
  const topLevelMountApi = Reflect.get(
    monaco as unknown as Record<string, unknown>,
    "typescript",
  ) as MonacoTypescriptApi | undefined;
  const topLevelStaticApi = Reflect.get(
    monacoEditor as unknown as Record<string, unknown>,
    "typescript",
  ) as MonacoTypescriptApi | undefined;
  const legacyMountApi = (
    monaco.languages as typeof monaco.languages & {
      typescript?: MonacoTypescriptApi;
    }
  ).typescript;
  const legacyStaticApi = (
    monacoEditor.languages as typeof monacoEditor.languages & {
      typescript?: MonacoTypescriptApi;
    }
  ).typescript;
  const moduleApi =
    monacoTypescriptContribution as unknown as MonacoTypescriptApi;

  const rawCandidates = [
    topLevelMountApi,
    topLevelStaticApi,
    legacyMountApi,
    legacyStaticApi,
    moduleApi,
  ];
  const validCandidates = rawCandidates.filter(isMonacoTypescriptApi);
  const uniqueCandidates = Array.from(new Set(validCandidates));

  return {
    apis: uniqueCandidates,
    rawAvailability: {
      hasTopLevelMountApi: Boolean(topLevelMountApi),
      hasTopLevelStaticApi: Boolean(topLevelStaticApi),
      hasLegacyMountApi: Boolean(legacyMountApi),
      hasLegacyStaticApi: Boolean(legacyStaticApi),
      hasModuleApi: Boolean(moduleApi),
      hasModuleDefaults: Boolean(
        moduleApi.typescriptDefaults && moduleApi.javascriptDefaults,
      ),
    },
  };
};

const debugTypeScriptWorkerState = async (
  monaco: typeof monacoEditor,
  typescriptApi: MonacoTypescriptApi,
  modelPath: string,
) => {
  if (!isMonacoDebugEnabled()) {
    return;
  }

  if (!typescriptApi.getTypeScriptWorker) {
    debugMonacoWarn("TS worker API unavailable", { modelPath });
    return;
  }

  try {
    const modelUri = monaco.Uri.parse(modelPath);
    const getWorker = await typescriptApi.getTypeScriptWorker();
    const worker = (await getWorker(modelUri)) as MonacoWorkerDiagnosticsApi;

    const scriptsResult = worker.getScriptFileNames?.();
    const scriptFileNames = scriptsResult
      ? await Promise.resolve(scriptsResult)
      : [];
    const syntactic = worker.getSyntacticDiagnostics
      ? await worker.getSyntacticDiagnostics(modelPath)
      : [];
    const semantic = worker.getSemanticDiagnostics
      ? await worker.getSemanticDiagnostics(modelPath)
      : [];
    const compilerOptions = worker.getCompilerOptionsDiagnostics
      ? await worker.getCompilerOptionsDiagnostics(modelPath)
      : [];

    debugMonaco("TS worker snapshot", {
      modelPath,
      scriptFilesCount: scriptFileNames.length,
      sampleScriptFiles: scriptFileNames.slice(0, 12),
      syntacticDiagnostics: syntactic.length,
      semanticDiagnostics: semantic.length,
      compilerOptionsDiagnostics: compilerOptions.length,
    });
  } catch (error) {
    debugMonacoWarn("Failed to inspect TS worker", {
      modelPath,
      error,
    });
  }
};

const registerCustomMonacoTheme = (monaco: typeof monacoEditor) => {
  if (isCustomThemeRegistered) {
    return;
  }

  monaco.editor.defineTheme("lootlog-addon-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "keyword", foreground: "C586C0" },
      { token: "number", foreground: "B5CEA8" },
      { token: "string", foreground: "CE9178" },
      { token: "delimiter", foreground: "D4D4D4" },
      { token: "type.identifier", foreground: "4EC9B0" },
      { token: "identifier", foreground: "9CDCFE" },
      { token: "predefined", foreground: "4FC1FF" },
      { token: "constructor", foreground: "DCDCAA" },
      { token: "tag", foreground: "569CD6" },
    ],
    colors: {
      "editor.background": "#0B1220",
      "editor.foreground": "#E5E7EB",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#94A3B8",
      "editorCursor.foreground": "#38BDF8",
      "editor.selectionBackground": "#1D4ED833",
      "editor.inactiveSelectionBackground": "#1D4ED822",
      "editorIndentGuide.background1": "#1E293B99",
      "editorIndentGuide.activeBackground1": "#334155CC",
    },
  });

  monaco.editor.defineTheme("lootlog-dracula", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6272A4", fontStyle: "italic" },
      { token: "keyword", foreground: "FF79C6" },
      { token: "number", foreground: "BD93F9" },
      { token: "string", foreground: "F1FA8C" },
      { token: "delimiter", foreground: "F8F8F2" },
      { token: "type.identifier", foreground: "8BE9FD" },
      { token: "identifier", foreground: "F8F8F2" },
      { token: "predefined", foreground: "50FA7B" },
      { token: "constructor", foreground: "FFB86C" },
      { token: "tag", foreground: "FF79C6" },
    ],
    colors: {
      "editor.background": "#282A36",
      "editor.foreground": "#F8F8F2",
      "editorLineNumber.foreground": "#6272A4",
      "editorLineNumber.activeForeground": "#F8F8F2",
      "editorCursor.foreground": "#FF79C6",
      "editor.selectionBackground": "#44475A99",
      "editor.inactiveSelectionBackground": "#44475A66",
      "editorIndentGuide.background1": "#44475A99",
      "editorIndentGuide.activeBackground1": "#6272A4CC",
    },
  });

  monaco.editor.defineTheme("lootlog-github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8B949E", fontStyle: "italic" },
      { token: "keyword", foreground: "FF7B72" },
      { token: "number", foreground: "79C0FF" },
      { token: "string", foreground: "A5D6FF" },
      { token: "delimiter", foreground: "C9D1D9" },
      { token: "type.identifier", foreground: "7EE787" },
      { token: "identifier", foreground: "C9D1D9" },
      { token: "predefined", foreground: "D2A8FF" },
      { token: "constructor", foreground: "FFA657" },
      { token: "tag", foreground: "7EE787" },
    ],
    colors: {
      "editor.background": "#0D1117",
      "editor.foreground": "#C9D1D9",
      "editorLineNumber.foreground": "#6E7681",
      "editorLineNumber.activeForeground": "#C9D1D9",
      "editorCursor.foreground": "#58A6FF",
      "editor.selectionBackground": "#1F6FEB66",
      "editor.inactiveSelectionBackground": "#1F6FEB33",
      "editorIndentGuide.background1": "#30363D99",
      "editorIndentGuide.activeBackground1": "#484F58CC",
    },
  });

  isCustomThemeRegistered = true;
};

type MonacoTypescriptApi = {
  ScriptTarget?: { ES2020?: number };
  ModuleKind?: { CommonJS?: number; ESNext?: number; NodeNext?: number };
  ModuleResolutionKind?: { NodeJs?: number; NodeNext?: number };
  JsxEmit?: { ReactJSX?: number };
  getTypeScriptWorker?: () => Promise<
    (...uris: monacoEditor.Uri[]) => Promise<unknown>
  >;
  getJavaScriptWorker?: () => Promise<
    (...uris: monacoEditor.Uri[]) => Promise<unknown>
  >;
  typescriptDefaults: {
    setCompilerOptions: (options: Record<string, unknown>) => void;
    setDiagnosticsOptions: (options: Record<string, unknown>) => void;
    setEagerModelSync: (value: boolean) => void;
    setExtraLibs: (libs: { content: string; filePath?: string }[]) => void;
  };
  javascriptDefaults: {
    setCompilerOptions: (options: Record<string, unknown>) => void;
    setDiagnosticsOptions: (options: Record<string, unknown>) => void;
    setEagerModelSync: (value: boolean) => void;
    setExtraLibs: (libs: { content: string; filePath?: string }[]) => void;
  };
};

const SDK_AMBIENT_DECLARATION = `
declare module "@lootlog/addon-sdk" {
  export type AddonGameApi = {
    interface: "ni" | "si";
    getInitializeState: () => boolean;
    hero: unknown;
    map: unknown;
    npcs: unknown[];
    getOther: (key: string) => unknown;
    getNpc: (key: number) => unknown;
    getNpcTpl: (key: number) => unknown;
    getNpcIcon: (key: number) => string | undefined;
    getWorldName: () => string;
  };

  export type AddonSetupContext = {
    Game: AddonGameApi;
    Engine: Window extends { Engine: infer TEngine } ? TEngine : unknown;
    window: Window;
    gameEventsManager: unknown;
    log: (...messages: unknown[]) => void;
  };

  export type RemoteGameClientAddon = {
    id: string;
    name: string;
    description?: string;
    version?: string;
    order?: number;
    defaultEnabled?: boolean;
    setup?: (context: AddonSetupContext) => void | (() => void);
  };

  export function defineAddon<TAddon extends RemoteGameClientAddon>(
    addon: TAddon,
  ): TAddon;
}
`.trim();

const PATHS_PROBE_DECLARATION = `
export const LOOTLOG_PATHS_PROBE = "lootlog-paths-ok" as const;
export type LootlogPathsProbe = typeof LOOTLOG_PATHS_PROBE;
`.trim();

const AT_ALIAS_PROBE_DECLARATION = `
export const AT_ALIAS_PATHS_PROBE = "at-alias-paths-ok" as const;
export type AtAliasPathsProbe = typeof AT_ALIAS_PATHS_PROBE;
`.trim();

const DEFAULT_COMPILER_HINTS: AddonTypeBundle["compilerHints"] = {
  baseUrl: "file:///src",
  paths: {
    "@/*": ["*"],
  },
};

const normalizeVirtualFilePath = (path: string) => {
  if (path.startsWith("file://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `file://${path}`;
  }

  return `file:///src/${path.replace(/^\.?\//, "")}`;
};

const resolveCompilerHints = (typeBundle?: AddonTypeBundle) => {
  const compilerHints = typeBundle?.compilerHints ?? DEFAULT_COMPILER_HINTS;
  const normalizedPaths =
    Object.keys(compilerHints.paths ?? {}).length > 0
      ? compilerHints.paths
      : DEFAULT_COMPILER_HINTS.paths;
  const rawBaseUrl = compilerHints.baseUrl || DEFAULT_COMPILER_HINTS.baseUrl;
  const normalizedBaseUrl = normalizeVirtualFilePath(rawBaseUrl);

  return {
    baseUrl: normalizedBaseUrl,
    paths: normalizedPaths,
  };
};

const buildMonacoExtraLibs = (typeBundle?: AddonTypeBundle) => {
  const files = new Map<string, string>();

  for (const file of typeBundle?.files ?? []) {
    if (!file.path || !file.content) {
      continue;
    }

    files.set(normalizeVirtualFilePath(file.path), file.content);
  }

  files.set(
    "file:///src/types/lootlog-addon-sdk.d.ts",
    typeBundle?.sdkDeclaration?.trim() || SDK_AMBIENT_DECLARATION,
  );

  if (!files.has("file:///src/types/lootlog-paths-probe.ts")) {
    files.set(
      "file:///src/types/lootlog-paths-probe.ts",
      PATHS_PROBE_DECLARATION,
    );
  }

  if (!files.has("file:///src/paths-probe.ts")) {
    files.set("file:///src/paths-probe.ts", AT_ALIAS_PROBE_DECLARATION);
  }

  return Array.from(files.entries()).map(([filePath, content]) => ({
    content,
    filePath,
  }));
};

const configureAddonEditorTypeSystem = (
  monaco: typeof monacoEditor,
  typeBundle?: AddonTypeBundle,
) => {
  debugMonaco("configureAddonEditorTypeSystem:start", {
    hasTypeBundle: Boolean(typeBundle),
    typeBundleFiles: typeBundle?.files?.length ?? 0,
    sdkDeclarationLength: typeBundle?.sdkDeclaration?.length ?? 0,
  });

  const { apis: typescriptApis, rawAvailability } =
    getMonacoTypescriptApis(monaco);

  if (typescriptApis.length === 0) {
    debugMonacoWarn("typescript API unavailable", {
      ...rawAvailability,
    });
    return false;
  }

  const primaryTypescriptApi = typescriptApis[0];
  if (!primaryTypescriptApi) {
    return false;
  }

  const compilerHints = resolveCompilerHints(typeBundle);
  const compilerPaths: Record<string, string[]> = {
    ...compilerHints.paths,
    "@lootlog/addon-sdk": compilerHints.paths["@lootlog/addon-sdk"] ?? [
      "types/lootlog-addon-sdk.d.ts",
    ],
    "@lootlog/paths-probe": compilerHints.paths["@lootlog/paths-probe"] ?? [
      "types/lootlog-paths-probe.ts",
    ],
  };

  const moduleResolution =
    primaryTypescriptApi.ModuleResolutionKind?.NodeNext ??
    primaryTypescriptApi.ModuleResolutionKind?.NodeJs ??
    2;
  const moduleKind =
    primaryTypescriptApi.ModuleKind?.NodeNext ??
    primaryTypescriptApi.ModuleKind?.ESNext ??
    primaryTypescriptApi.ModuleKind?.CommonJS ??
    1;
  const supportsNodeNextResolution = Boolean(
    primaryTypescriptApi.ModuleResolutionKind?.NodeNext,
  );

  const sharedCompilerOptions = {
    target: primaryTypescriptApi.ScriptTarget?.ES2020 ?? 7,
    module: moduleKind,
    moduleResolution,
    jsx: primaryTypescriptApi.JsxEmit?.ReactJSX ?? 4,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    noEmit: true,
    strict: false,
    baseUrl: compilerHints.baseUrl,
    paths: compilerPaths,
    ...(supportsNodeNextResolution
      ? {
          resolvePackageJsonExports: true,
          resolvePackageJsonImports: true,
        }
      : {}),
  };

  const extraLibs = buildMonacoExtraLibs(typeBundle);
  for (const typescriptApi of typescriptApis) {
    const typescriptDefaults = typescriptApi.typescriptDefaults;
    const javascriptDefaults = typescriptApi.javascriptDefaults;

    typescriptDefaults.setEagerModelSync(true);
    javascriptDefaults.setEagerModelSync(true);
    typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });
    javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });
    typescriptDefaults.setCompilerOptions(sharedCompilerOptions);
    javascriptDefaults.setCompilerOptions(sharedCompilerOptions);
    typescriptDefaults.setExtraLibs(extraLibs);
    javascriptDefaults.setExtraLibs(extraLibs);
  }

  const extraLibPaths = new Set(extraLibs.map((lib) => lib.filePath));
  const hasAddonSdkDeclaration = extraLibs.some((lib) =>
    lib.content.includes('declare module "@lootlog/addon-sdk"'),
  );
  debugMonaco("configureAddonEditorTypeSystem:applied", {
    baseUrl: compilerHints.baseUrl,
    pathsKeys: Object.keys(compilerPaths),
    extraLibCount: extraLibs.length,
    hasAddonSdkDeclaration,
    hasGameFile: extraLibPaths.has("file:///src/lib/game.ts"),
    hasGameEventsFile: extraLibPaths.has(
      "file:///src/lib/game-events-manager.ts",
    ),
    hasAtAliasProbe: extraLibPaths.has("file:///src/paths-probe.ts"),
    hasLootlogProbe: extraLibPaths.has(
      "file:///src/types/lootlog-paths-probe.ts",
    ),
    typescriptApisConfigured: typescriptApis.length,
    extraLibSample: Array.from(extraLibPaths).slice(0, 15),
  });

  const workerProbeUri = monaco.Uri.parse("file:///src/runtime/addon-main.ts");
  void debugTypeScriptWorkerState(
    monaco,
    primaryTypescriptApi,
    "file:///src/runtime/addon-main.ts",
  );
  for (const typescriptApi of typescriptApis) {
    void typescriptApi
      .getTypeScriptWorker?.()
      .then((getWorker) => getWorker(workerProbeUri))
      .catch(() => undefined);
    void typescriptApi
      .getJavaScriptWorker?.()
      .then((getWorker) => getWorker(workerProbeUri))
      .catch(() => undefined);
  }

  return true;
};

const useMonacoTypeBundle = (
  monaco: typeof monacoEditor | null,
  typeBundle?: AddonTypeBundle,
  editorReady = false,
) => {
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!editorReady || !monaco) {
      return;
    }
    const didConfigureFromMount = configureAddonEditorTypeSystem(
      monaco,
      typeBundle,
    );
    const didConfigureFromStaticImport = configureAddonEditorTypeSystem(
      monacoEditor,
      typeBundle,
    );

    debugMonaco("useMonacoTypeBundle:configure-result", {
      editorReady,
      didConfigureFromMount,
      didConfigureFromStaticImport,
      hasMonacoFromMount: Boolean(monaco),
      mountMonacoEqualsStatic: monaco === monacoEditor,
    });

    if (!didConfigureFromMount && !didConfigureFromStaticImport) {
      const timeoutId = window.setTimeout(() => {
        setRetryTick((previous) => previous + 1);
      }, 100);
      debugMonacoWarn("useMonacoTypeBundle:retry-scheduled", {
        retryTick,
      });
      return () => window.clearTimeout(timeoutId);
    }
  }, [editorReady, monaco, retryTick, typeBundle]);
};

export const MonacoAddonEditor = ({
  value,
  language,
  onChange,
  onSaveShortcut,
  typeBundle,
  disabled = false,
  height = "420px",
  theme = DEFAULT_MONACO_ADDON_THEME,
}: MonacoAddonEditorProps) => {
  const [editorReady, setEditorReady] = useState(false);
  const [activeMonaco, setActiveMonaco] = useState<typeof monacoEditor | null>(
    null,
  );
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const markerDebugListenerRef = useRef<monacoEditor.IDisposable | null>(null);
  const saveShortcutListenerRef = useRef<monacoEditor.IDisposable | null>(null);
  const onSaveShortcutRef = useRef(onSaveShortcut);
  const isDisabledRef = useRef(disabled);

  useMonacoTypeBundle(activeMonaco, typeBundle, editorReady);

  useEffect(() => {
    onSaveShortcutRef.current = onSaveShortcut;
  }, [onSaveShortcut]);

  useEffect(() => {
    isDisabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    return () => {
      markerDebugListenerRef.current?.dispose();
      markerDebugListenerRef.current = null;
      saveShortcutListenerRef.current?.dispose();
      saveShortcutListenerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeMonaco) {
      return;
    }

    registerCustomMonacoTheme(activeMonaco);
    activeMonaco.editor.setTheme(theme);
  }, [activeMonaco, theme]);

  const path =
    language === "typescript"
      ? "file:///src/runtime/addon-main.ts"
      : "file:///src/runtime/addon-main.js";

  const handleBeforeMount: BeforeMount = (monaco) => {
    debugMonaco("beforeMount", {
      mountMonacoEqualsStatic: monaco === monacoEditor,
      hasTypeBundle: Boolean(typeBundle),
      bundleFileCount: typeBundle?.files?.length ?? 0,
    });

    configureAddonEditorTypeSystem(monaco, typeBundle);
    configureAddonEditorTypeSystem(monacoEditor, typeBundle);
  };

  const handleMount: OnMount = (editor, monaco) => {
    debugMonaco("onMount:start", {
      mountMonacoEqualsStatic: monaco === monacoEditor,
      path,
      language,
      hasInitialModel: Boolean(editor.getModel()),
      initialModelUri: editor.getModel()?.uri.toString(),
    });

    configureAddonEditorTypeSystem(monaco, typeBundle);
    configureAddonEditorTypeSystem(monacoEditor, typeBundle);
    editorRef.current = editor;
    setActiveMonaco(monaco);
    setEditorReady(true);

    const preferredUri = monaco.Uri.parse(path);
    let model = editor.getModel();

    if (!model || model.uri.toString() !== preferredUri.toString()) {
      model = monaco.editor.getModel(preferredUri);

      if (!model) {
        model = monaco.editor.createModel(
          editor.getValue(),
          language,
          preferredUri,
        );
      }

      editor.setModel(model);
    }

    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }

    if (isMonacoDebugEnabled()) {
      const logCurrentModelMarkers = (reason: string) => {
        const currentModel = editor.getModel();
        if (!currentModel) {
          debugMonacoWarn("markers:no-current-model", { reason });
          return;
        }

        const markers = monaco.editor.getModelMarkers({
          resource: currentModel.uri,
        });

        if (markers.length === 0) {
          debugMonaco("markers:none", {
            reason,
            modelUri: currentModel.uri.toString(),
          });
          return;
        }

        debugMonacoWarn("markers:present", {
          reason,
          modelUri: currentModel.uri.toString(),
          markersCount: markers.length,
          markers: markers
            .slice(0, 20)
            .map((marker: monacoEditor.editor.IMarker) => ({
              code: marker.code,
              message: marker.message,
              severity: marker.severity,
              startLineNumber: marker.startLineNumber,
              startColumn: marker.startColumn,
              endLineNumber: marker.endLineNumber,
              endColumn: marker.endColumn,
            })),
        });
      };

      logCurrentModelMarkers("onMount");
      markerDebugListenerRef.current?.dispose();
      markerDebugListenerRef.current = monaco.editor.onDidChangeMarkers(
        (resources: readonly monacoEditor.Uri[]) => {
          const modelUri = editor.getModel()?.uri.toString();
          if (!modelUri) {
            return;
          }

          const changedCurrentModel = resources.some(
            (resource: monacoEditor.Uri) => resource.toString() === modelUri,
          );
          if (!changedCurrentModel) {
            return;
          }

          logCurrentModelMarkers("onDidChangeMarkers");
        },
      );
    }

    saveShortcutListenerRef.current?.dispose();
    saveShortcutListenerRef.current = editor.onKeyDown((event) => {
      const isSaveShortcut =
        event.keyCode === monaco.KeyCode.KeyS &&
        (event.ctrlKey || event.metaKey);
      if (!isSaveShortcut || isDisabledRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void onSaveShortcutRef.current?.();
    });

    debugMonaco("onMount:ready", {
      activeModelUri: editor.getModel()?.uri.toString(),
      modelLanguage: editor.getModel()?.getLanguageId(),
      isReadOnly: disabled,
    });
  };

  useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly: disabled,
    });
  }, [disabled]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeMonaco) {
      return;
    }

    const preferredUri = activeMonaco.Uri.parse(path);
    let model = editor.getModel();

    if (!model || model.uri.toString() !== preferredUri.toString()) {
      model = activeMonaco.editor.getModel(preferredUri);

      if (!model) {
        model = activeMonaco.editor.createModel(
          editor.getValue(),
          language,
          preferredUri,
        );
      }

      editor.setModel(model);
    }

    if (model) {
      activeMonaco.editor.setModelLanguage(model, language);
    }

    debugMonaco("model-sync", {
      language,
      path,
      modelUri: model?.uri.toString(),
      modelLanguage: model?.getLanguageId(),
    });
  }, [activeMonaco, language, path]);

  return (
    <Editor
      height={height}
      path={path}
      language={language}
      defaultLanguage={language}
      value={value}
      theme={theme}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        readOnly: disabled,
        quickSuggestions: {
          comments: false,
          other: true,
          strings: true,
        },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "allDocuments",
        parameterHints: {
          enabled: true,
        },
      }}
      loading={
        <div
          className="flex items-center justify-center rounded-md border bg-background/80 backdrop-blur-sm"
          style={{ minHeight: height }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Monaco editor...
          </div>
        </div>
      }
    />
  );
};
