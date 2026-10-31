import {
  installFakeFactionWarApi,
  readSandboxFactionWarMode,
} from "./fake-faction-war-api";
import { installSandboxRuntime } from "./fake-runtime/install";

const runtimeInterface =
  new URLSearchParams(window.location.search).get("interface") === "si"
    ? "si"
    : "ni";

// Fake Margonem globals must exist before any game-client module is evaluated.
const runtime = installSandboxRuntime(runtimeInterface);

const factionWarMode = readSandboxFactionWarMode();

if (factionWarMode) installFakeFactionWarApi(factionWarMode, runtime.world);

void import("@/bootstrap").then(async ({ bootstrapGameClient }) => {
  bootstrapGameClient();
  const { mountSandboxPanel } = await import("./panel/mount-sandbox-panel");
  mountSandboxPanel(runtime);
});
