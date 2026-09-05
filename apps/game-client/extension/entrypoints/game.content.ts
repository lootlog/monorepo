import { gameMatches, excludedGameMatches } from "../matches";
import { defineContentScript } from "wxt/utils/define-content-script";
import { bootstrapGameClient, type GameClientRuntime } from "@/bootstrap";
import { connectPageTransport } from "@/extension/page-transport";

export default defineContentScript({
  matches: gameMatches,
  excludeMatches: excludedGameMatches,
  world: "MAIN",
  runAt: "document_end",
  main() {
    if (
      window.top !== window ||
      !/^[^.]+\.margonem\.(pl|com)$/.test(location.hostname)
    )
      return;
    let transport: ReturnType<typeof connectPageTransport> | undefined;
    let runtime: GameClientRuntime | undefined;
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("pagehide", dispose);
      let failure: { error: unknown } | undefined;
      for (const cleanup of [
        () => runtime?.dispose(),
        () => transport?.dispose(),
      ]) {
        try {
          cleanup();
        } catch (error) {
          failure ??= { error };
        }
      }
      if (failure) throw failure.error;
    };

    try {
      transport = connectPageTransport(dispose);
      if (disposed) {
        transport.dispose();
        return;
      }
      const runtimeWindow = window as Window & {
        __lootlogGameClientRuntime?: GameClientRuntime;
      };
      runtimeWindow.__lootlogGameClientRuntime?.dispose();
      runtime = bootstrapGameClient(transport);
      if (disposed) {
        runtime.dispose();
        return;
      }
      window.addEventListener("pagehide", dispose, { once: true });
    } catch (error) {
      try {
        dispose();
      } catch {
        // Cleanup must not replace the error that prevented startup.
      }
      throw error;
    }
  },
});
