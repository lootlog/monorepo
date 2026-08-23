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

export function bootstrapGameClient(): GameClientRuntime {
  const runtimeWindow = window as RuntimeWindow;
  const activeRuntime = runtimeWindow.__lootlogGameClientRuntime;

  if (
    activeRuntime?.version === RUNTIME_VERSION &&
    activeRuntime.state !== "disposed"
  ) {
    return activeRuntime;
  }

  activeRuntime?.dispose();
  const restoreApiClients = configureGameApiClients();

  const rootElement = createRootElement();
  let root: ReturnType<typeof ReactDOM.createRoot>;

  try {
    root = ReactDOM.createRoot(rootElement);
  } catch (error) {
    restoreApiClients();
    rootElement.remove();
    throw error;
  }

  let teardownPublicApi: (() => void) | null = null;
  let disposed = false;

  const runtime: GameClientRuntime = {
    root,
    state: "bootstrapping",
    version: RUNTIME_VERSION,
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      runtime.state = "disposed";

      try {
        root.unmount();
      } finally {
        try {
          teardownPublicApi?.();
        } finally {
          try {
            disposeSoundPlayback();
          } finally {
            try {
              disposeSocket();
            } finally {
              try {
                resetTransientRuntimeState();
              } finally {
                try {
                  queryClient.clear();
                } finally {
                  restoreApiClients();
                  if (runtimeWindow.__lootlogGameClientRuntime === runtime) {
                    delete runtimeWindow.__lootlogGameClientRuntime;
                  }

                  rootElement.remove();
                }
              }
            }
          }
        }
      }
    },
  };

  runtimeWindow.__lootlogGameClientRuntime = runtime;

  try {
    teardownPublicApi = bootstrapPublicApi(queryClient);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    runtime.state = "ready";
  } catch (error) {
    runtime.dispose();
    throw error;
  }

  return runtime;
}

bootstrapGameClient();
