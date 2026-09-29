import { gameMatches, excludedGameMatches } from "../matches";
import { defineContentScript } from "wxt/utils/define-content-script";
import { bootstrapGameClient, type GameClientRuntime } from "@/bootstrap";
import { connectPageTransport } from "@/extension/page-transport";
import type { ExtensionClosedReason } from "@/extension/protocol";
import { createDiagnosticsReport } from "@/lib/diagnostics-report";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import {
  showRuntimeFailureNotice,
  type RuntimeFailureKind,
} from "@/lib/runtime-failure-notice";

const CLOSED_NOTICE_KIND = {
  replaced: "extensionReplaced",
  invalidated: "extensionInvalidated",
  unavailable: "extensionUnavailable",
} as const satisfies Record<ExtensionClosedReason, RuntimeFailureKind>;

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

    const runtimeWindow: Window & {
      __lootlogGameClientRuntime?: GameClientRuntime;
    } = window;

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

    // The extension let go of a running overlay: explain why instead of
    // letting it vanish. A runtime already replaced or torn down stays quiet.
    const handleClosed = (reason: ExtensionClosedReason | undefined) => {
      const interrupted =
        !disposed &&
        runtime !== undefined &&
        runtime.state !== "disposed" &&
        runtimeWindow.__lootlogGameClientRuntime === runtime;

      if (!interrupted) {
        dispose();

        return;
      }

      let diagnostics = "";

      try {
        diagnostics = createDiagnosticsReport({
          bridgeHealth: margonemRuntimeBridge.getHealth(),
          failure: `extension closed the game tab connection (${reason ?? "unknown"})`,
        });
      } catch {
        // The notice and the teardown must not depend on the report.
      }

      try {
        dispose();
      } finally {
        showRuntimeFailureNotice(
          CLOSED_NOTICE_KIND[reason ?? "unavailable"],
          diagnostics,
        );
      }
    };

    try {
      transport = connectPageTransport(handleClosed);

      if (disposed) {
        transport.dispose();

        return;
      }

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
