import "@/index.css";
import i18n from "@/i18n/config";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeClient } from "@lootlog/client/realtime";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getChatControllerGetChatMessagesQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { Chat } from "@/features/chat/chat";
import {
  createChatMessage,
  createChatReadyRoom,
} from "@/features/chat/chat-test-fixtures";
import { useChatStore } from "@/store/chat.store";
import { useWindowsStore } from "@/store/windows.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { RealtimeWire } from "@/test/realtime-wire";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { storageKey } from "@/lib/storage-key";

// Standalone development page: real Chat/ChatView and runtime adapter, synthetic
// HTTP, realtime transport and NI host only. Never connects to a game/backend.
setTestRuntimeGame({
  interface: "ni",
  world: "Fobos",
  hero: { accountId: "account-1", characterId: "101", name: "Hero" },
});
localStorage.setItem(
  storageKey("ll:chat:selected-guild:account-1:101"),
  JSON.stringify("all"),
);
useChatStore.setState({
  isIntegratedMode: false,
  selectedInputGuildIds: [],
  selectedGuildByCharacter: {},
  chatFilter: "all",
  draftsByGuild: {},
  focusRequest: null,
});
useWindowsStore.getState().setOpen("chat", true);
useWindowsStore.getState().setSize("chat", { width: 280, height: 440 });
useWindowsStore.getState().setPosition("chat", { x: 16, y: 140 });
usePartyFinderStore
  .getState()
  .mergeProjection(createChatReadyRoom({ guildIds: ["a"], world: "Fobos" }));
const guilds = [
  { id: "a", name: "Synthetic A", icon: null, vanityUrl: null },
  { id: "b", name: "Synthetic B", icon: null, vanityUrl: null },
];
const preferences = { guildsOrder: [], hiddenGuildIds: [] };
const messages = Array.from({ length: 20 }, (_, index) =>
  createChatMessage({
    id: `view-${index}`,
    guildId: index % 2 === 0 ? "a" : "b",
    message: `Synthetic conversation ${index}: help with this monster`,
    senderId: `sender-${index % 3}`,
    timestamp: new Date(Date.UTC(2026, 8, 9, 12, 0, index)).toISOString(),
  }),
);
const http: typeof fetch = (input) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.pathname.endsWith("get-session"))
    return Promise.resolve(Response.json(null));
  if (url.pathname === "/preferences")
    return Promise.resolve(Response.json({ domains: {} }));
  if (url.pathname.endsWith("chat-messages"))
    return Promise.resolve(
      Response.json(
        messages.filter((message) =>
          url.pathname.includes(`/guilds/${message.guildId}/`),
        ),
      ),
    );
  if (url.pathname.endsWith("members/@me"))
    return Promise.resolve(Response.json(null));
  if (url.pathname.endsWith("permissions"))
    return Promise.resolve(Response.json(["OWNER"]));
  if (url.pathname.endsWith("user-preferences"))
    return Promise.resolve(Response.json(preferences));
  return Promise.resolve(Response.json([]));
};
configureApiClients({
  main: { baseUrl: "https://fixture.invalid", fetch: http },
});
configureGameClientPlatform({
  fetch: http,
  createRealtime: () =>
    new RealtimeClient({
      url: "https://fixture.invalid",
      webSocketFactory: () => new RealtimeWire(),
    }),
});
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  },
});
client.setQueryData(
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  guilds,
);
client.setQueryData(
  getUsersControllerGetUserPreferencesQueryKey(),
  preferences,
);
for (const guild of guilds)
  client.setQueryData(
    getChatControllerGetChatMessagesQueryKey({ guildId: guild.id }),
    messages.filter((message) => message.guildId === guild.id),
  );

let nativeCalls = 0;
const nativeWindow = {
  setChannel: (_channel: string) => {
    nativeCalls += 1;
    return "native-result";
  },
};
const nativeInput = {
  setChannel: () => {},
  focus: () =>
    document.querySelector<HTMLInputElement>("#native-input")?.focus(),
};
testRuntimeWindow.Engine = {
  chatController: {
    getChatWindow: () => nativeWindow,
    getChatInputWrapper: () => nativeInput,
  },
};
const installNativeHost = () => {
  document.getElementById("native-host")?.remove();
  const container = document.createElement("section");
  container.id = "native-host";
  container.style.cssText =
    "position:absolute;left:330px;top:140px;width:280px;height:440px;border:1px solid #64748b;background:#182334;color:white";
  container.innerHTML = `<div class="new-chat-window" style="position:absolute;left:0;height:100%"><div class="chat-channel-card-wrapper" style="display:flex;height:28px;gap:4px"><button class="chat-channel-card active">Native channel</button></div><div class="chat-message-wrapper">Native messages</div><div class="chat-input-wrapper"><input id="native-input" aria-label="Native input" /></div></div>`;
  container
    .querySelector("button")
    ?.addEventListener("click", () => nativeWindow.setChannel("LOCAL"));
  document.body.append(container);
};
installNativeHost();
const wait = (ms = 180) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const button = (label: string) => {
  const match = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find(
    (item) =>
      item.getAttribute("aria-label") === label ||
      item.textContent?.trim() === label,
  );
  if (!match) throw new Error(`Missing button: ${label}`);
  return match;
};
const visible = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  return Boolean(
    element &&
    element.getBoundingClientRect().height > 0 &&
    getComputedStyle(element).display !== "none",
  );
};

const nativeWidthMatches = () => {
  const host = document.querySelector(".new-chat-window");
  const column = document.getElementById("native-host");
  return (
    !!host &&
    !!column &&
    Math.abs(host.getBoundingClientRect().width - column.clientWidth) <= 1
  );
};

function Fixture() {
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const run = async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    const check = (label: string, pass: boolean) =>
      setResults((current) => [
        ...current,
        `${pass ? "PASS" : "FAIL"} ${label}`,
      ]);
    try {
      await wait(350);
      check(
        "Root transcript visible at 280px",
        visible("[data-chat-viewport]"),
      );
      check(
        "All view requires explicit recipient",
        visible('[role="textbox"]') && button("Pozycja").disabled,
      );
      check(
        "Gathering survives independently of composer",
        !!document.body.textContent?.includes("Zgłoszono"),
      );
      button("Synthetic A").click();
      await wait();
      check(
        "Explicit recipient mounts composer",
        visible('[contenteditable="true"]'),
      );
      useWindowsStore.getState().setSize("chat", { width: 260, height: 260 });
      await wait();
      check(
        "Minimum window keeps a readable transcript",
        (document.querySelector("[data-chat-viewport]")?.getBoundingClientRect()
          .height ?? 0) >= 60,
      );
      const message = document.querySelector<HTMLElement>(
        '[data-slot="message"]',
      );
      const body = message?.querySelector<HTMLElement>('[data-slot="bubble"]');
      check(
        "Message actions do not enlarge the sender line",
        !!message &&
          !!body &&
          body.getBoundingClientRect().top -
            message.getBoundingClientRect().top <=
            Number.parseFloat(getComputedStyle(message).lineHeight) + 1,
      );
      const help = button("Pomoc");
      const helpRect = help.getBoundingClientRect();
      check(
        "Resize handle does not cover Help",
        help.contains(
          document.elementFromPoint(helpRect.right - 2, helpRect.bottom - 2),
        ),
      );
      useWindowsStore.getState().setSize("chat", { width: 280, height: 440 });
      await wait();
      useChatStore.getState().setDraft("a", "Session draft");
      button("Przenieś do czatu gry").click();
      await wait(350);
      check(
        "Real Chat mounts inside NI panel",
        visible(".ll-integrated-chat-panel [data-chat-viewport]"),
      );
      check(
        "Native input hidden while Lootlog selected",
        !visible(".chat-input-wrapper"),
      );
      check(
        "Draft survives window to NI switch",
        document.querySelector('[contenteditable="true"]')?.textContent ===
          "Session draft",
      );
      const host = document.querySelector<HTMLElement>(
        ".ll-integrated-chat-panel",
      );
      check("NI window stays within native column", nativeWidthMatches());
      check(
        "NI contents fit 280px host",
        !!host && host.scrollWidth <= host.clientWidth + 1,
      );
      button("Native channel").click();
      await wait();
      check(
        "Native tab restores native panel and calls game once",
        visible(".chat-input-wrapper") &&
          nativeCalls === 1 &&
          !visible(".ll-integrated-chat-panel"),
      );
      button("Lootlog").click();
      await wait();
      nativeInput.focus();
      await wait();
      check(
        "Native whisper focus returns native composer",
        visible(".chat-input-wrapper") &&
          document.activeElement?.id === "native-input",
      );
      button("Lootlog").click();
      await wait();
      installNativeHost();
      await wait(1200);
      check(
        "Host rebuild remounts one Lootlog tab",
        document.querySelectorAll(".ll-integrated-chat-tab").length === 1 &&
          visible(".ll-integrated-chat-panel [data-chat-viewport]"),
      );
      button("Otwórz w osobnym oknie").click();
      await wait(350);
      check(
        "Detach cleans native host and preserves draft",
        !document.querySelector(".ll-integrated-chat-tab") &&
          visible(".chat-input-wrapper") &&
          document.querySelector('[contenteditable="true"]')?.textContent ===
            "Session draft",
      );
    } catch (error) {
      setResults((current) => [...current, `FAIL ${String(error)}`]);
    } finally {
      setRunning(false);
    }
  };
  return (
    <main style={{ fontFamily: "sans-serif", padding: 16, color: "white" }}>
      <h1>Real Chat + NI host verification</h1>
      <button
        id="run-verification"
        onClick={() => void run()}
        disabled={running}
      >
        Run root verification
      </button>
      <pre
        id="verification-results"
        style={{
          position: "absolute",
          left: 650,
          top: 120,
          whiteSpace: "pre-wrap",
        }}
      >
        {running ? "RUNNING\n" : "READY\n"}
        {results.join("\n")}
      </pre>
      <div id="lootlog-root" className="dark-theme">
        <Chat />
      </div>
    </main>
  );
}
void i18n.changeLanguage("pl");
document.body.style.background = "#101722";
const root = document.getElementById("fixture-root");
if (!root) throw new Error("Missing root");
createRoot(root).render(
  <QueryClientProvider client={client}>
    <Fixture />
  </QueryClientProvider>,
);
