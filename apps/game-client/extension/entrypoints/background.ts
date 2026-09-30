import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import { createGameRealtimeClient } from "@/lib/game-client-platform";
import { createBackgroundConnection } from "@/extension/background-connection";
import {
  EXTENSION_CHANNEL,
  encodeMessage,
  type ExtensionClosedReason,
} from "@/extension/protocol";
import { LOOTLOG_APP_URL } from "@/config/app";
import { gamePageUrlPattern } from "../matches";

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    void browser.tabs.create({ url: LOOTLOG_APP_URL });
  });
  let active: { close: (reason?: ExtensionClosedReason) => void } | undefined;
  browser.runtime.onConnect.addListener((port) => {
    const sender = port.sender;

    if (
      port.name !== EXTENSION_CHANNEL ||
      sender?.id !== browser.runtime.id ||
      sender.frameId !== 0 ||
      sender.tab?.id === undefined ||
      !sender.url ||
      !gamePageUrlPattern.test(sender.url)
    ) {
      port.disconnect();

      return;
    }

    active?.close("replaced");
    const realtime = createGameRealtimeClient();

    const connection = createBackgroundConnection(realtime, (message) =>
      port.postMessage(message),
    );

    const owner = {
      close: (reason?: ExtensionClosedReason) => {
        connection.dispose();

        try {
          port.postMessage(encodeMessage({ type: "closed", reason }));
        } catch {
          /* Already disconnected. */
        }

        port.disconnect();
      },
    };

    active = owner;
    port.onMessage.addListener(function receivePageMessage(message: unknown) {
      void connection.receive(message).catch(() => owner.close());
    });
    port.onDisconnect.addListener(() => {
      connection.dispose();

      if (active === owner) active = undefined;
    });
    port.postMessage(encodeMessage({ type: "ready" }));
  });
});
