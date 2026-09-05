import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import "./index.css";
import { bootstrapPublicApi } from "@/features/public-api";
import { queryClient } from "@/lib/query-client";
import { configureGameApiClients } from "@/lib/configure-api-clients";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { disposeSocket } from "@/lib/socket";
import { resetTransientRuntimeState } from "@/lib/runtime-state";
import { getRuntimeCookie } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  configureGameClientPlatform,
  type GameClientPlatform,
} from "@/lib/game-client-platform";
import { resetExtensionLoginWindow } from "@/store/windows.store";
import { migrateRetiredLocalStorage } from "@/lib/storage-migrations";

const ROOT_Z_INDEX_BY_INTERFACE = {
  ni: 11,
  si: 449,
} as const;

type GameInterface = keyof typeof ROOT_Z_INDEX_BY_INTERFACE;
export type GameClientRuntime = {
  dispose: () => void;
  root: ReturnType<typeof ReactDOM.createRoot>;
  state: "bootstrapping" | "ready" | "disposed";
  version: string;
  installation: "userscript" | "extension";
};

type RuntimeWindow = Window & {
  __lootlogGameClientRuntime?: GameClientRuntime;
};

const RUNTIME_VERSION = import.meta.env.VITE_GAME_CLIENT_VERSION;

function getDocumentCookie(name: string): string | null {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return cookie.slice(name.length + 1);
  }
}

export function getLootlogRootZIndex(): number {
  const gameInterface =
    getRuntimeCookie("interface") ?? getDocumentCookie("interface");

  if (gameInterface === "si" || gameInterface === "ni") {
    return ROOT_Z_INDEX_BY_INTERFACE[gameInterface satisfies GameInterface];
  }

  return ROOT_Z_INDEX_BY_INTERFACE.ni;
}

function createRootElement(): HTMLDivElement {
  document.getElementById("lootlog-root")?.remove();

  const rootElement = document.createElement("div");
  rootElement.id = "lootlog-root";
  rootElement.className =
    "ll:absolute ll:top-0 ll:left-0 ll:h-screen ll:w-screen ll:pointer-events-none";
  rootElement.style.zIndex = String(getLootlogRootZIndex());
  document.body.append(rootElement);
  return rootElement;
}

export function bootstrapGameClient(
  platform?: GameClientPlatform,
): GameClientRuntime {
  const installation = platform ? "extension" : "userscript";
  migrateRetiredLocalStorage();

  const runtimeWindow = window as RuntimeWindow;
  const activeRuntime = runtimeWindow.__lootlogGameClientRuntime;

  if (
    activeRuntime &&
    activeRuntime.state !== "disposed" &&
    ((activeRuntime.installation === "extension" &&
      installation === "userscript") ||
      (activeRuntime.version === RUNTIME_VERSION &&
        activeRuntime.installation === installation))
  ) {
    return activeRuntime;
  }

  activeRuntime?.dispose();
  let restorePlatform: (() => void) | undefined;
  let restoreClients: (() => void) | undefined;
  let rootElement: HTMLDivElement | undefined;
  let root: ReturnType<typeof ReactDOM.createRoot> | undefined;
  let teardownPublicApi: (() => void) | undefined;
  let runtime: GameClientRuntime | undefined;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (runtime) runtime.state = "disposed";

    let failure: { error: unknown } | undefined;
    const steps = [
      () => root?.unmount(),
      () => teardownPublicApi?.(),
      disposeSoundPlayback,
      disposeSocket,
      resetTransientRuntimeState,
      () => queryClient.clear(),
      () => restoreClients?.(),
      () => restorePlatform?.(),
      () => {
        if (runtime && runtimeWindow.__lootlogGameClientRuntime === runtime)
          delete runtimeWindow.__lootlogGameClientRuntime;
      },
      () => rootElement?.remove(),
    ];
    for (const step of steps) {
      try {
        step();
      } catch (error) {
        failure ??= { error };
      }
    }
    if (failure) throw failure.error;
  };

  try {
    restorePlatform = configureGameClientPlatform(platform);
    restoreClients = configureGameApiClients();
    rootElement = createRootElement();
    root = ReactDOM.createRoot(rootElement);
    runtime = {
      root,
      state: "bootstrapping",
      version: RUNTIME_VERSION,
      installation,
      dispose,
    };
    runtimeWindow.__lootlogGameClientRuntime = runtime;
    teardownPublicApi = bootstrapPublicApi(queryClient);
    if (installation === "extension") resetExtensionLoginWindow();
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    runtime.state = "ready";
    return runtime;
  } catch (error) {
    try {
      dispose();
    } catch {
      // Cleanup must not replace the error that prevented startup.
    }
    throw error;
  }
}
