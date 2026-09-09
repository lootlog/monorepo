import { CHAT_INTEGRATION_ENABLED } from "@/features/chat/chat.constants";
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
    message:
      index === 0
        ? "OK"
        : `Synthetic conversation ${index}: help with this monster`,
    senderId: `sender-${index % 3}`,
    type: index === 16 ? "NPC" : "NORMAL",
    npc:
      index === 16
        ? {
            id: 16,
            name: "Fixture NPC",
            icon: "fixture/npc.gif",
            wt: 80,
            type: 1,
            prof: "w",
            lvl: 180,
            hpp: 100,
            x: 1,
            y: 2,
            location: "Fixture",
            world: "Fobos",
          }
        : undefined,
    replyTo:
      index === 18
        ? {
            messageId: "view-0",
            senderNick: "VeryLongQuotedCharacterName",
            message:
              "Quoted message with enough context to exceed the available width. " +
              "longword".repeat(15),
            type: "NOTIFICATION",
          }
        : undefined,
    timestamp: new Date(Date.UTC(2026, 8, 9, 12, 0, index)).toISOString(),
  }),
);
messages.push(
  createChatMessage({
    id: "visual-gathering",
    guildId: "a",
    type: "PARTY_GATHERING",
    message: "Gathering",
    timestamp: "2026-09-09T12:01:00.000Z",
    partyGathering: {
      notificationId: "visual-room",
      discordId: "organizer",
      world: "Fobos",
      description: "Long gathering description " + "longword".repeat(20),
      minLvl: 100,
      maxLvl: 300,
    },
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

function messageStartsBesideSender() {
  const message = document.querySelector('[data-slot="message"]');
  const body = message?.lastElementChild;
  const sender = message?.querySelector("[data-base-ui-tooltip-trigger]");
  return (
    !!sender &&
    !!body &&
    Math.abs(
      body.getBoundingClientRect().top - sender.getBoundingClientRect().top,
    ) <= 1
  );
}

async function checkReplyHighlight(
  check: (label: string, pass: boolean) => void,
) {
  const quote = document.querySelector<HTMLButtonElement>(
    'button[title^="VeryLongQuotedCharacterName:"]',
  );
  quote?.click();
  await wait();
  const target = document.querySelector<HTMLElement>(
    '[data-message-id="view-0"]',
  );
  const viewport = document.querySelector("[data-chat-viewport]");
  check(
    "Reply scroll highlights the visible original message",
    !!target?.dataset.chatHighlighted &&
      !!viewport &&
      target.getBoundingClientRect().bottom >
        viewport.getBoundingClientRect().top &&
      target.getBoundingClientRect().top <
        viewport.getBoundingClientRect().bottom,
  );
  await wait(800);
  quote?.click();
  await wait(800);
  check(
    "Repeated reply click restarts highlight duration",
    target?.dataset.chatHighlighted === "true",
  );
  await wait(800);
  check(
    "Reply highlight clears automatically",
    !target?.dataset.chatHighlighted,
  );
}

async function checkGatheringLayout(
  width: number,
  check: (label: string, pass: boolean) => void,
) {
  useWindowsStore.getState().setSize("chat", { width, height: 440 });
  usePartyFinderStore.getState().clearReadyRooms();
  useChatStore.getState().clearReplyDraft("a");
  await wait();
  const inputTop = () =>
    document.querySelector('[contenteditable="true"]')?.getBoundingClientRect()
      .top;
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>("[data-chat-row-key]"),
  );
  check(
    `Messages fit with 6px left and 2px right padding at ${width}px`,
    rows.length > 0 &&
      rows.every(
        (row) =>
          getComputedStyle(row).paddingLeft === "6px" &&
          getComputedStyle(row).paddingRight === "2px" &&
          row.scrollWidth <= row.clientWidth,
      ),
  );
  const quote = document.querySelector<HTMLButtonElement>(
    'button[title^="VeryLongQuotedCharacterName:"]',
  );
  check(
    `Long quote fits at ${width}px`,
    !!quote && quote.scrollWidth <= quote.clientWidth,
  );
  const npcBubble = document.querySelector(
    '[data-chat-message-id="view-16"] [data-slot="bubble"]',
  );
  const npcRow = npcBubble?.closest("[data-chat-row-key]");
  check(
    `NPC background fills row at ${width}px`,
    !!npcBubble &&
      !!npcRow &&
      Math.abs(
        npcBubble.getBoundingClientRect().left -
          npcRow.getBoundingClientRect().left,
      ) < 1 &&
      Math.abs(
        npcBubble.getBoundingClientRect().right -
          npcRow.getBoundingClientRect().right,
      ) < 1,
  );
  const baselineTop = inputTop();
  const room = createChatReadyRoom({
    guildIds: ["a"],
    description: "Long gathering " + "longword".repeat(20),
    npc: {
      name: "Long monster name for panel",
      icon: "fixture/npc.gif",
      location: "Fixture",
      lvl: 180,
      type: "ELITE2",
    },
  });
  usePartyFinderStore.getState().mergeProjection(room);
  useChatStore.getState().setReplyDraft({
    guildId: "a",
    messageId: "view-0",
    senderNick: "Quoted author",
    message: "Long reply ".repeat(20),
    type: "NORMAL",
  });
  await wait();
  check(
    `Gathering and reply preserve input position at ${width}px`,
    inputTop() === baselineTop,
  );
  const chat = document.querySelector<HTMLElement>(
    '[data-ll-draggable-window="chat"]',
  );
  check(
    `Gathering and reply fit ${width}px`,
    !!chat && chat.scrollWidth <= chat.clientWidth + 1,
  );
  check(
    `Gathering management link is available at ${width}px`,
    Array.from(chat?.querySelectorAll("button") ?? []).some(
      (button) => button.getAttribute("aria-label") === "Zarządzaj",
    ),
  );
  usePartyFinderStore.getState().mergeProjection({
    ...room,
    revision: room.revision + 1,
    viewer: "ORGANIZER",
    ownedParticipantIds: [],
  });
  await wait();
  check(
    `Organizer gathering preserves input position at ${width}px`,
    inputTop() === baselineTop,
  );
  const invite = button("Zaproś zgłoszonych");
  const npc = chat?.querySelector<HTMLImageElement>(
    'img[alt="Long monster name for panel"]',
  );
  check(
    `NPC invite action is to the right at ${width}px`,
    !!npc &&
      invite.getBoundingClientRect().left > npc.getBoundingClientRect().right,
  );
  usePartyFinderStore.getState().mergeProjection({
    ...room,
    npc: undefined,
    revision: room.revision + 2,
    viewer: "ORGANIZER",
    ownedParticipantIds: [],
  });
  await wait();
  const heading = Array.from(chat?.querySelectorAll("span") ?? []).find(
    (element) => element.textContent === "Party finder",
  );
  check(
    `Description invite sits below the header at ${width}px`,
    !!heading &&
      button("Zaproś zgłoszonych").getBoundingClientRect().top >
        heading.getBoundingClientRect().bottom,
  );
  usePartyFinderStore.getState().mergeProjection({
    ...room,
    npc: undefined,
    description: undefined,
    minLvl: undefined,
    maxLvl: undefined,
    revision: room.revision + 3,
    viewer: "ORGANIZER",
    ownedParticipantIds: [],
  });
  await wait();
  check(
    `Empty gathering has no header bottom margin at ${width}px`,
    !!heading?.parentElement &&
      getComputedStyle(heading.parentElement).marginBottom === "0px",
  );
  check(
    `Empty gathering invite stays in header at ${width}px`,
    !!heading &&
      Math.abs(
        button("Zaproś zgłoszonych").getBoundingClientRect().top -
          heading.getBoundingClientRect().top,
      ) <= 4,
  );
  check(
    `Organizer header fits ${width}px`,
    !!chat && chat.scrollWidth <= chat.clientWidth + 1,
  );

  useChatStore.getState().clearReplyDraft("a");
  usePartyFinderStore.getState().clearReadyRooms();
  await wait();
  check(
    `Leaving gathering preserves draft at ${width}px`,
    document.querySelector('[contenteditable="true"]')?.textContent ===
      "Session draft",
  );
}

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
        "All view keeps quick actions available",
        visible('[role="textbox"]') && !button("Szybkie akcje").disabled,
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
      check("Message starts beside sender", messageStartsBesideSender());
      button("Ukryj filtry").click();
      await wait();
      check(
        "Filter toggle hides the three tabs",
        !Array.from(document.querySelectorAll("button")).some(
          (element) => element.textContent?.trim() === "Rozmowy",
        ),
      );
      check(
        "Hidden filters show all messages",
        useChatStore.getState().chatFilter === "all",
      );
      button("Pokaż filtry").click();
      await wait();
      check(
        "Filter toggle restores the three tabs",
        Array.from(document.querySelectorAll("button")).some(
          (element) => element.textContent?.trim() === "Rozmowy",
        ),
      );

      const checkFullWidth = (hostSelector: string) => {
        const viewport = document.querySelector("[data-chat-viewport]");
        const row = document.querySelector("[data-chat-row-key]");
        const host = document.querySelector(hostSelector);
        check(
          "Striped rows fill the chat width",
          !!viewport &&
            !!row &&
            !!host &&
            Math.abs(
              row.getBoundingClientRect().width - viewport.clientWidth,
            ) <= 1 &&
            Math.abs(
              viewport.getBoundingClientRect().width - host.clientWidth,
            ) <= 1,
        );
      };
      checkFullWidth('[data-ll-draggable-window="chat"] > div');
      const help = button("Szybkie akcje");
      const helpRect = help.getBoundingClientRect();
      check(
        "Resize handle does not cover the quick action button",
        help.contains(
          document.elementFromPoint(
            helpRect.left + helpRect.width / 2,
            helpRect.top + helpRect.height / 2,
          ),
        ),
      );
      useWindowsStore.getState().setSize("chat", { width: 280, height: 440 });
      await wait();
      useChatStore.getState().setDraft("a", "Session draft");
      await checkGatheringLayout(280, check);
      await checkGatheringLayout(420, check);
      await checkReplyHighlight(check);
      useWindowsStore.getState().setSize("chat", { width: 280, height: 440 });
      usePartyFinderStore.getState().mergeProjection({
        ...createChatReadyRoom({
          notificationId: "room-final",
          guildIds: ["a"],
          description:
            "Gathering preview\nLooking for players to join the group.",
          npc: {
            name: "Monster preview",
            prof: "w",
            x: 0,
            y: 12,
            icon: "fixture/npc.gif",
            location: "Fixture",
            lvl: 180,
            type: "ELITE2",
          },
        }),
        viewer: "ORGANIZER",
        ownedParticipantIds: [],
      });
      await wait();
      if (!CHAT_INTEGRATION_ENABLED) {
        useChatStore.setState({ isIntegratedMode: true });
        await wait(350);
        check(
          "Saved integrated preference still uses the draggable window",
          visible('[data-ll-draggable-window="chat"] [data-chat-viewport]'),
        );
        check(
          "Integration toggle is unavailable",
          !document.querySelector('button[aria-label="Przenieś do czatu gry"]'),
        );
        check("Native input remains visible", visible(".chat-input-wrapper"));
        check(
          "No integrated host is installed",
          !document.querySelector(
            ".ll-integrated-chat-tab, .ll-integrated-chat-panel",
          ),
        );
        check(
          "Draft remains available",
          document.querySelector('[contenteditable="true"]')?.textContent ===
            "Session draft",
        );
        return;
      }
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
      checkFullWidth(".ll-integrated-chat-panel");
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
