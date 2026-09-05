import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import { createGameRealtimeClient } from "@/lib/game-client-platform";
import { createBackgroundConnection } from "@/extension/background-connection";
import { EXTENSION_CHANNEL, encodeMessage } from "@/extension/protocol";
import { LOOTLOG_APP_URL } from "@/config/app";

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    void browser.tabs.create({ url: LOOTLOG_APP_URL });
  });
  let active: { close: () => void } | undefined;
  browser.runtime.onConnect.addListener((port) => {
    const sender = port.sender;
    if (
      port.name !== EXTENSION_CHANNEL ||
      sender?.id !== browser.runtime.id ||
      sender.frameId !== 0 ||
      sender.tab?.id === undefined ||
      !sender.url ||
      !/^https:\/\/(?!www\.|new\.|forum\.|commons\.|dev-commons\.)[^./]+\.margonem\.(pl|com)\//.test(
        sender.url,
      )
    ) {
      port.disconnect();
      return;
    }
    active?.close();
    const extensionUrl = new URL(browser.runtime.getURL("/"));
    const realtime = createGameRealtimeClient(
      `${extensionUrl.protocol}//${extensionUrl.host}`,
    );
    const connection = createBackgroundConnection(realtime, (message) =>
      port.postMessage(message),
    );
    const owner = {
      close: () => {
        connection.dispose();
        try {
          port.postMessage(encodeMessage({ type: "closed" }));
        } catch {
          /* Already disconnected. */
        }
        port.disconnect();
      },
    };
    active = owner;
    port.onMessage.addListener((message: unknown) => {
      void connection.receive(message).catch(() => owner.close());
    });
    port.onDisconnect.addListener(() => {
      connection.dispose();
      if (active === owner) active = undefined;
    });
    port.postMessage(encodeMessage({ type: "ready" }));
  });
});
