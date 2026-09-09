import "@/index.css";
import i18n from "@/i18n/config";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { ChatInput } from "@/features/chat/components/chat-input";
import { useChatQuickActions } from "@/features/chat/hooks/use-chat-quick-actions";
import {
  getSelectedChatGuildId,
  useChatStore,
  type ChatReplyDraft,
} from "@/store/chat.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { seedRuntimeOthers } from "@/test/runtime-other-fixtures";

// Standalone dev HTML entry. Synthetic runtime and HTTP are the only fakes.
// No production bootstrap, websocket, or authenticated backend is used.
setTestRuntimeGame({
  world: "fixture",
  hero: { characterId: "101", name: "Fixture Hero" },
});
const syntheticPlayers = {
  enemy: {
    d: {
      id: "enemy",
      account: 7,
      icon: "",
      lvl: 100,
      prof: "w",
      nick: "Synthetic enemy",
      relation: 3,
    },
  },
};
seedRuntimeOthers(syntheticPlayers);
const requests: { url: string; body: string }[] = [];
let failChat = false;
let nextMessageId = 1;
configureApiClients({
  main: {
    baseUrl: "https://fixture.invalid",
    fetch: (input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        const body = String(init.body ?? "");
        requests.push({ url, body });
        if (url.includes("chat-messages")) {
          if (failChat)
            return Promise.resolve(
              Response.json(
                { message: "Synthetic send failure" },
                { status: 503 },
              ),
            );
          return Promise.resolve(
            Response.json({
              ...JSON.parse(body),
              id: `sent-${nextMessageId++}`,
              guildId: "a",
              senderId: "fixture",
              timestamp: new Date().toISOString(),
              canEdit: false,
              canDelete: false,
            }),
          );
        }
        if (url.includes("messaging"))
          return Promise.resolve(
            Response.json({
              guildIds: ["a"],
              notificationId: `alarm-${nextMessageId++}`,
            }),
          );
      }
      return Promise.resolve(Response.json([]));
    },
  },
});
const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
client.setQueryData(
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  [
    { id: "a", name: "Synthetic A", icon: null, vanityUrl: null },
    { id: "b", name: "Synthetic B", icon: null, vanityUrl: null },
  ],
);
client.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
  guildsOrder: [],
  hiddenGuildIds: [],
});
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 150));
const editor = () => {
  const element = document.querySelector<HTMLElement>(
    '[contenteditable="true"]',
  );
  if (!element) throw new Error("Editable composer missing");
  return element;
};
const editorText = () => editor().textContent ?? "";
const submitEditor = () =>
  document.querySelector('[role="textbox"]')?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
const hasSentPosition = () =>
  requests.some((request) =>
    request.body.includes('"message":"Fixture Hero(230w), Ithan (1, 2)"'),
  );

const clickLabel = (label: string) => {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find(
    (item) =>
      item.getAttribute("aria-label") === label || item.textContent === label,
  );
  if (!button) throw new Error(`Missing action ${label}`);
  button.click();
};
const quote: ChatReplyDraft = {
  guildId: "a",
  messageId: "original",
  senderNick: "Synthetic sender",
  message: "Help on this map",
  type: "NOTIFICATION",
};

const hasHighlightedQuote = () => {
  const text = Array.from(document.querySelectorAll("div")).find(
    (element) =>
      element.childElementCount === 0 &&
      element.textContent?.endsWith("Help on this map"),
  );
  const card = text?.parentElement?.parentElement;
  if (!card || !text) return false;
  return (
    getComputedStyle(card).borderTopWidth === "0px" &&
    getComputedStyle(text).fontStyle === "italic" &&
    getComputedStyle(card).backgroundColor !== "rgba(0, 0, 0, 0)"
  );
};

const Fixture = () => {
  const [instance, setInstance] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const selectedGuildId = useChatStore(getSelectedChatGuildId);
  const { sendComing } = useChatQuickActions();
  const run = async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    requests.length = 0;
    failChat = false;
    const check = (name: string, pass: boolean, detail = "") =>
      setResults((current) => [
        ...current,
        `${pass ? "PASS" : "FAIL"} ${name} ${detail}`,
      ]);
    try {
      const store = useChatStore.getState();
      store.setSelectedChatGuildId("a");
      store.setDraft("a", "Draft A");
      store.setDraft("b", "Draft B");
      store.setReplyDraft(quote);
      await wait();
      check(
        "Organization A draft and reply visible",
        editor().textContent === "Draft A" &&
          document.body.textContent?.includes("Help on this map") === true,
      );
      store.setSelectedChatGuildId("b");
      await wait();
      check(
        "Organization B has an independent draft",
        editor().textContent === "Draft B" &&
          !document.body.textContent?.includes("Help on this map"),
      );
      store.setSelectedChatGuildId("a");
      setInstance((key) => key + 1);
      await wait();
      check(
        "Remount restores A draft and reply",
        editor().textContent === "Draft A" &&
          document.body.textContent?.includes("Help on this map") === true,
      );
      check(
        "Quote uses an italic highlight without a border",
        hasHighlightedQuote(),
      );
      failChat = true;
      editor().focus();
      submitEditor();
      await wait();
      check(
        "Failed send retains draft and quote",
        requests.some((item) => item.url.includes("chat-messages")) &&
          editor().textContent === "Draft A" &&
          useChatStore.getState().replyDraftsByGuild.a?.messageId ===
            "original",
      );
      failChat = false;
      const probe = document.getElementById("focus-probe");
      probe?.focus();
      clickLabel(i18n.t("chat:quickActions.position"));
      await wait();
      check("Position sends immediately", hasSentPosition());
      check(
        "Position preserves draft and focus",
        editor().textContent === "Draft A" && document.activeElement === probe,
      );
      store.setDraft("a", "x".repeat(128));
      await wait();
      const lengthBeforePosition = editorText().length;
      probe?.focus();
      clickLabel(i18n.t("chat:quickActions.position"));
      await wait();
      check(
        "Position sends with a full draft without truncating it",
        editor().textContent === "x".repeat(128),
        `before=${lengthBeforePosition}, after=${editorText().length}`,
      );
      store.setDraft("a", "Keep while sending alarm");
      store.setSelectedChatGuildId("a");
      await wait();
      probe?.focus();
      const beforeAlarm = requests.length;
      clickLabel(i18n.t("chat:quickActions.help"));
      await wait();
      check(
        "Help sends to selected organization and includes enemy count",
        requests
          .slice(beforeAlarm)
          .some(
            (item) =>
              item.url.includes("messaging") &&
              item.body.includes('"guildIds":["a"]') &&
              item.body.includes("Wykryci wrogowie: 1"),
          ),
      );
      check(
        "Help preserves draft and focus",
        editor().textContent === "Keep while sending alarm" &&
          document.activeElement === probe,
      );
      const beforeComing = requests.length;
      await sendComing(quote);
      await wait();
      check(
        "Coming sends a normal quoted response without changing draft or focus",
        requests
          .slice(beforeComing)
          .some(
            (item) =>
              item.body.includes('"message":"Idę"') &&
              item.body.includes('"type":"NORMAL"') &&
              item.body.includes('"messageId":"original"'),
          ) &&
          editor().textContent === "Keep while sending alarm" &&
          document.activeElement === probe,
      );
      store.setSelectedChatGuildId("all");
      store.setDraft("", "Unaddressed draft");
      await wait();
      const beforeUnaddressed = requests.length;
      submitEditor();
      await wait();
      check(
        "All-organizations view cannot send without one explicit recipient",
        requests.length === beforeUnaddressed &&
          useChatStore.getState().draftsByGuild[""] === "Unaddressed draft",
      );
    } catch (error) {
      setResults((current) => [...current, `ERROR ${String(error)}`]);
    } finally {
      failChat = false;
      setRunning(false);
    }
  };
  return (
    <main
      style={{
        background: "#14181f",
        color: "white",
        minHeight: "100vh",
        padding: 24,
        fontFamily: "sans-serif",
      }}
    >
      <h1>Chat composer verification — synthetic data</h1>
      <p>All HTTP is intercepted locally. No messages leave this page.</p>
      <button disabled={running} onClick={() => void run()}>
        Run composer checks
      </button>
      <label>
        Recipient{" "}
        <select
          value={selectedGuildId ?? ""}
          onChange={(event) =>
            useChatStore.getState().setSelectedChatGuildId(event.target.value)
          }
        >
          <option value="all">All — choose organization above</option>
          <option value="a">Synthetic A</option>
          <option value="b">Synthetic B</option>
        </select>
      </label>
      <button id="focus-probe">Focus probe</button>
      <div
        id="lootlog-root"
        style={{
          width: 440,
          padding: 12,
          border: "1px solid #64748b",
          marginTop: 16,
        }}
      >
        <ChatInput
          key={instance}
          selectedGuildId={
            selectedGuildId === "all" ? undefined : selectedGuildId
          }
        />
      </div>
      <pre
        id="verification-results"
        aria-live="polite"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {running ? "RUNNING\n" : "READY\n"}
        {results.join("\n")}
      </pre>
    </main>
  );
};
const root = document.getElementById("fixture-root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <QueryClientProvider client={client}>
    <Fixture />
  </QueryClientProvider>,
);
