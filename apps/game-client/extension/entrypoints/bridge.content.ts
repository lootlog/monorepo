import { gameMatches, excludedGameMatches } from "../matches";
import { defineContentScript } from "wxt/utils/define-content-script";
import { browser } from "wxt/browser";
import {
  EXTENSION_CHANNEL,
  ExtensionRequestSchema,
  ExtensionMessageSchema,
  decodeMessage,
  encodeMessage,
} from "@/extension/protocol";

export default defineContentScript({
  matches: gameMatches,
  excludeMatches: excludedGameMatches,
  runAt: "document_start",
  main(ctx) {
    if (
      window.top !== window ||
      !/^[^.]+\.margonem\.(pl|com)$/.test(location.hostname)
    )
      return;
    let cleanup: (() => void) | undefined;
    ctx.addEventListener(window, "message", (event: MessageEvent<unknown>) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        !event.data ||
        typeof event.data !== "object" ||
        !("channel" in event.data) ||
        event.data.channel !== EXTENSION_CHANNEL ||
        event.ports.length !== 1
      )
        return;
      cleanup?.();
      const page = event.ports[0];
      if (!page) return;
      let stopped = false;
      let background: ReturnType<typeof browser.runtime.connect> | undefined;
      let retry: ReturnType<typeof setTimeout> | undefined;
      const connect = () => {
        if (stopped || ctx.isInvalid) return;
        try {
          const port = browser.runtime.connect({ name: EXTENSION_CHANNEL });
          background = port;
          port.onMessage.addListener((message: unknown) => {
            if (stopped || background !== port) return;
            const parsed = ExtensionMessageSchema.parse(decodeMessage(message));
            page.postMessage(encodeMessage(parsed));
            if (parsed.type === "closed") {
              stopped = true;
              page.close();
              port.disconnect();
            }
          });
          port.onDisconnect.addListener(() => {
            if (stopped || background !== port) return;
            background = undefined;
            page.postMessage(encodeMessage({ type: "reset" }));
            retry = setTimeout(connect, 1000);
          });
        } catch {
          page.postMessage(encodeMessage({ type: "closed" }));
        }
      };
      page.onmessage = (message: MessageEvent<unknown>) => {
        if (stopped) return;
        try {
          const request = ExtensionRequestSchema.parse(
            decodeMessage(message.data),
          );
          if (request.type === "release") {
            cleanup?.();
            return;
          }
          if (background) background.postMessage(encodeMessage(request));
          else if (request.type !== "cancel")
            page.postMessage(
              encodeMessage({
                type: "error",
                id: request.id,
                message: "Extension background unavailable",
              }),
            );
        } catch {
          /* Ignore malformed page messages without exposing extension capabilities. */
        }
      };
      page.start();
      connect();
      cleanup = () => {
        stopped = true;
        clearTimeout(retry);
        page.postMessage(encodeMessage({ type: "closed" }));
        page.close();
        background?.disconnect();
      };
    });
    ctx.addEventListener(window, "pagehide", () => cleanup?.());
    ctx.onInvalidated(() => cleanup?.());
  },
});
