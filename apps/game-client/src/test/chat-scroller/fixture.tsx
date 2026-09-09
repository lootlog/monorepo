import "@/index.css";
import { dispatchChatScrollToMessage } from "@/features/chat/chat-scroll-to-message";
import i18n from "@/i18n/config";
import { createRoot } from "react-dom/client";
import { Profiler, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { ChatMessageList } from "@/features/chat/components/chat-message-list";
import type { ChatScrollPosition } from "@/features/chat/components/chat-transcript";
import type { ChatRenderableMessage } from "@/features/chat/chat.helpers";
import { createChatMessage } from "@/features/chat/chat-test-fixtures";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";

document.body.classList.add("si");

// Development-only HTML entry; never imported by the game bootstrap. Every
// record is synthetic and HTTP is isolated from any authenticated backend.
configureApiClients({
  main: {
    baseUrl: "https://fixture.invalid",
    fetch: () => Promise.resolve(Response.json([])),
  },
});
const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
const initial = (): ChatRenderableMessage[] =>
  Array.from({ length: 300 }, (_, id) => ({
    kind: "message",
    key: `fixture-${id}`,
    message: createChatMessage({
      id: `fixture-${id}`,
      message: `Public message ${id}. A longer synthetic message to verify line wrapping in a compact chat window.`,
      senderId: `sender-${id % 3}`,
      timestamp: new Date(Date.UTC(2026, 8, 9, 12, 0, id)).toISOString(),
    }),
  }));
const wait = (ms = 350) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const viewport = () => {
  const element = document.querySelector<HTMLElement>("[data-chat-viewport]");
  if (!element) throw new Error("Missing actual message viewport");
  return element;
};
const anchor = () => {
  const box = viewport().getBoundingClientRect();
  const row = [
    ...document.querySelectorAll<HTMLElement>("[data-chat-row-key]"),
  ].find((item) => item.getBoundingClientRect().bottom > box.top + 1);
  if (!row) throw new Error("No visible row");
  return {
    key: row.dataset.chatRowKey,
    offset: row.getBoundingClientRect().top - box.top,
  };
};
const atEnd = () =>
  Math.abs(
    viewport().scrollHeight - viewport().clientHeight - viewport().scrollTop,
  ) < 4;

const guildNamesById = { "guild-1": "Synthetic organization" };
const membersByGuildId = {};
const mentionContextsByGuildId = {};
const onReplyToMessage = () => {};
const seenIds = new Set<string>();
const onMessagesSeen = (ids: string[]) => {
  for (const id of ids) seenIds.add(id);
};
const largerAppearance = {
  ...CHAT_APPEARANCE_READABLE_PRESET,
  fontScalePercent: 120,
};

const Fixture = () => {
  const [messages, setMessages] = useState(initial);
  const [density, setDensity] = useState(100);
  const [height, setHeight] = useState(340);
  const [instance, setInstance] = useState(0);
  const [active, setActive] = useState(true);
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const saved = useRef<ChatScrollPosition | undefined>(undefined);
  const [position, setPosition] = useState<ChatScrollPosition | undefined>(
    undefined,
  );
  const nextId = useRef(300);
  const renderDurations = useRef<number[]>([]);
  const append = () => {
    const id = nextId.current++;
    setMessages((current) =>
      [
        ...current,
        {
          kind: "message" as const,
          key: `fixture-${id}`,
          message: createChatMessage({
            id: `fixture-${id}`,
            message: `New public message ${id}`,
            timestamp: new Date().toISOString(),
          }),
        },
      ].slice(-300),
    );
  };
  const run = async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    const check = (name: string, pass: boolean, details = "") =>
      setResults((current) => [
        ...current,
        `${pass ? "PASS" : "FAIL"} ${name} ${details}`,
      ]);
    try {
      saved.current = undefined;
      seenIds.clear();
      setActive(true);
      setPosition(undefined);
      setMessages(initial());
      nextId.current = 300;
      setDensity(100);
      setHeight(340);
      setInstance((key) => key + 1);
      await wait(500);
      check("Initial view follows the end", atEnd());
      check(
        "Game selection reset does not block message text",
        Array.from(
          document.querySelectorAll('[data-slot="bubble"] span'),
        ).every((element) => getComputedStyle(element).userSelect === "text"),
      );
      check(
        "Only actually visible messages become read",
        seenIds.has("fixture-299") && !seenIds.has("fixture-0"),
        `${seenIds.size} visible entries`,
      );
      const history = viewport();
      history.scrollTo({
        top: history.scrollHeight * 0.4,
        behavior: "instant",
      });
      history.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -1, bubbles: true }),
      );
      await wait();
      const before = anchor();
      renderDurations.current = [];
      append();
      await wait();
      const after = anchor();
      check(
        "Incoming message preserves history row",
        before.key === after.key && Math.abs(before.offset - after.offset) < 5,
        `${before.key} → ${after.key}; offset ${Math.round(after.offset - before.offset)}px`,
      );
      check(
        "300-message retention",
        document.querySelectorAll("[data-chat-row-key]").length === 300 &&
          !document.querySelector('[data-chat-row-key="fixture-0"]'),
      );
      check(
        "Append rendering measurement",
        true,
        `${renderDurations.current.map((duration) => duration.toFixed(1)).join(", ")}ms React commit work; 300 DOM rows`,
      );
      const ownBefore = anchor();
      append();
      await wait();
      const ownAfter = anchor();
      check(
        "Own-message insertion preserves history",
        ownBefore.key === ownAfter.key &&
          Math.abs(ownBefore.offset - ownAfter.offset) < 5,
      );
      viewport().scrollTo({
        top: viewport().scrollHeight,
        behavior: "instant",
      });
      await wait();
      viewport().dispatchEvent(
        new WheelEvent("wheel", { deltaY: 50, bubbles: true }),
      );
      append();
      await wait();
      check(
        "Manual bottom plus extra wheel resumes follow for own message",
        atEnd(),
      );
      viewport().scrollTo({
        top: viewport().scrollHeight * 0.4,
        behavior: "instant",
      });
      await wait();
      viewport().dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
      viewport().scrollTo({
        top: viewport().scrollHeight,
        behavior: "instant",
      });
      await wait();
      viewport().dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true }),
      );
      append();
      await wait();
      check("Scrollbar drag to bottom resumes follow for own message", atEnd());
      const latest = [
        ...document.querySelectorAll<HTMLButtonElement>("button"),
      ].find(
        (button) =>
          button.getAttribute("aria-label") ===
          i18n.t("chat:navigation.latest"),
      );
      if (!latest) throw new Error("Latest-message button missing");
      latest.click();
      await wait();
      check("Latest-message action reaches end", atEnd());
      await wait();
      check("Latest position remains stable", atEnd());
      viewport().dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
      viewport().dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true }),
      );
      append();
      await wait();
      check("Clicking without selecting keeps following the end", atEnd());
      const selectionRow = [
        ...document.querySelectorAll<HTMLElement>("[data-chat-row-key]"),
      ].at(-2);
      if (!selectionRow) throw new Error("Selection row missing");
      viewport().dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
      const range = document.createRange();
      range.selectNodeContents(selectionRow);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      const selectedBefore = anchor();
      append();
      await wait();
      check(
        "Text selection prevents following appended message",
        anchor().key === selectedBefore.key &&
          Math.abs(anchor().offset - selectedBefore.offset) < 5,
        JSON.stringify({ before: selectedBefore, after: anchor() }),
      );
      window.getSelection()?.removeAllRanges();
      viewport().scrollTo({
        top: viewport().scrollHeight * 0.4,
        behavior: "instant",
      });
      await wait();
      const resizeBefore = anchor();
      setHeight(260);
      setDensity(120);
      await wait(350);
      const resizeAfter = anchor();
      check(
        "Resize and density preserve readable anchor",
        resizeBefore.key === resizeAfter.key,
        `${resizeBefore.key} → ${resizeAfter.key}`,
      );
      const remountBefore = anchor();
      setPosition(saved.current);
      setInstance((key) => key + 1);
      await wait(350);
      const remountAfter = anchor();
      check(
        "Remount restores saved row",
        remountBefore.key === remountAfter.key &&
          Math.abs(remountBefore.offset - remountAfter.offset) < 5,
        `${remountBefore.key} → ${remountAfter.key}; ${remountBefore.offset} → ${remountAfter.offset}`,
      );
      setActive(false);
      await wait();
      seenIds.clear();
      dispatchChatScrollToMessage("fixture-50");
      await wait();
      check("Hidden view does not mark messages read", seenIds.size === 0);
      setActive(true);
      await wait();
      dispatchChatScrollToMessage("fixture-50");
      await wait();
      check(
        "Reply jump exposes the selected retained message",
        seenIds.has("fixture-50"),
      );
      check(
        "Reduced-motion scroll CSS is non-smooth",
        getComputedStyle(viewport()).scrollBehavior !== "smooth",
        `prefers-reduced-motion=${matchMedia("(prefers-reduced-motion: reduce)").matches}; CSS=${getComputedStyle(viewport()).scrollBehavior}`,
      );
    } catch (error) {
      setResults((current) => [...current, `ERROR ${String(error)}`]);
    } finally {
      setRunning(false);
    }
  };
  return (
    <main
      style={{
        padding: 24,
        color: "white",
        background: "#14181f",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Chat scroller verification — synthetic data</h1>
      <p>
        Uses the production ChatMessageList. Run checks in a foreground browser
        tab. For reduced-motion verification enable the OS preference and run
        again.
      </p>
      <div style={{ display: "flex", gap: 12, marginBlock: 16 }}>
        <button disabled={running} onClick={() => void run()}>
          Run browser checks
        </button>
        <button onClick={append}>Append message</button>
        <button
          onClick={() => {
            setPosition(saved.current);
            setInstance((key) => key + 1);
          }}
        >
          Remount saved view
        </button>
      </div>
      <div
        id="lootlog-root"
        className="dark-theme"
        style={{
          width: 420,
          color: "var(--foreground)",
          fontFamily: "Arial, sans-serif",
          height,
          border: "1px solid #64748b",
          position: "relative",
        }}
      >
        <Profiler
          id="chat"
          onRender={(_id, _phase, duration) => {
            renderDurations.current.push(duration);
          }}
        >
          <ChatMessageList
            key={instance}
            ariaLabel="Fixture chat messages"
            emptyStateTitle="No messages"
            guildNamesById={guildNamesById}
            membersByGuildId={membersByGuildId}
            mentionContextsByGuildId={mentionContextsByGuildId}
            onReplyToMessage={onReplyToMessage}
            selectedGuildId="guild-1"
            renderables={messages}
            appearance={
              density === 100
                ? CHAT_APPEARANCE_READABLE_PRESET
                : largerAppearance
            }
            position={position}
            isActive={active}
            onMessagesSeen={onMessagesSeen}
            onPositionChange={(position) => {
              saved.current = position;
            }}
          />
        </Profiler>
      </div>
      <pre
        id="verification-results"
        aria-live="polite"
        style={{ whiteSpace: "pre-wrap", marginTop: 24 }}
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
