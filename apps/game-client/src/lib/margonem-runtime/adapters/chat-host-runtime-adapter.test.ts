import { afterEach, describe, expect, it, vi } from "vitest";
import { watchIntegratedChatHost } from "./chat-host-runtime-adapter";

function fixture() {
  document.body.innerHTML = `<div class="new-chat-window"><div class="chat-channel-card-wrapper"><button class="chat-channel-card active">Native</button></div><div class="chat-message-wrapper" style="display:grid"></div><div class="chat-input-wrapper"></div></div>`;

  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Characterizes opaque native forwarding.
  const setChannel = vi.fn(function (this: unknown, ...args: unknown[]) {
    return { receiver: this, args };
  });

  const chatWindow = { setChannel };
  const input = { setChannel: vi.fn(), focus: vi.fn() };

  const runtime = Object.assign(window, {
    Engine: {
      chatController: {
        getChatWindow: () => chatWindow,
        getChatInputWrapper: () => input,
      },
    },
  });

  return { runtime, chatWindow, input, setChannel };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("NI chat host", () => {
  it("keeps the icon-only tab named and selectable", () => {
    const { runtime, chatWindow } = fixture();
    const changed = vi.fn();
    const host = watchIntegratedChatHost("Lootlog", changed, runtime);

    try {
      const tab = document.querySelector<HTMLButtonElement>(
        ".ll-integrated-chat-tab",
      );

      expect(tab?.getAttribute("aria-label")).toBe("Lootlog");
      expect(tab?.title).toBe("Lootlog");
      expect(tab?.textContent).toBe("");
      chatWindow.setChannel("LOCAL");
      tab
        ?.querySelector("svg")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(changed.mock.lastCall?.[0].selected).toBe(true);
    } finally {
      host.dispose();
    }
  });

  it("allows integrated content to scroll through the native wheel guard", () => {
    const { runtime } = fixture();
    const host = watchIntegratedChatHost("Lootlog", vi.fn(), runtime);

    // Characterizes Interface.blockWheel's documented native opt-in.
    const blockWheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.matches("textarea") &&
        !event.target.closest(".unblock-scroll")
      )
        event.preventDefault();
    };

    window.addEventListener("wheel", blockWheel, { passive: false });

    try {
      const content = document.createElement("div");
      document.querySelector(".ll-integrated-chat-panel")?.append(content);

      const integratedWheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 100,
      });

      content.dispatchEvent(integratedWheel);
      expect(integratedWheel.defaultPrevented).toBe(false);

      const nativeWheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 100,
      });

      document.querySelector(".chat-channel-card")?.dispatchEvent(nativeWheel);
      expect(nativeWheel.defaultPrevented).toBe(true);
    } finally {
      window.removeEventListener("wheel", blockWheel);
      host.dispose();
    }
  });

  it("restores native channels, forwards arguments/receiver/result once, and cleans up", () => {
    const { runtime, chatWindow, setChannel, input } = fixture();
    const nativeHost = document.querySelector<HTMLElement>(".new-chat-window");

    if (!nativeHost) throw new Error("Missing native chat fixture");
    nativeHost.style.right = "2px";
    const changed = vi.fn();
    const host = watchIntegratedChatHost("Lootlog", changed, runtime);
    expect(nativeHost.style.right).toBe("0px");
    expect(
      document.querySelector<HTMLElement>(".chat-message-wrapper")?.style
        .display,
    ).toBe("none");
    expect(chatWindow.setChannel("LOCAL", null, true)).toEqual({
      receiver: chatWindow,
      args: ["LOCAL", null, true],
    });
    expect(setChannel).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector<HTMLElement>(".chat-message-wrapper")?.style
        .display,
    ).toBe("grid");
    expect(changed.mock.lastCall?.[0].selected).toBe(false);
    host.select();
    input.focus();
    expect(changed.mock.lastCall?.[0].selected).toBe(false);
    host.select();
    document.querySelector<HTMLButtonElement>(".chat-channel-card")?.click();
    expect(changed.mock.lastCall?.[0].selected).toBe(false);
    host.dispose();
    expect(nativeHost.style.right).toBe("2px");
    expect(chatWindow.setChannel).toBe(setChannel);
    expect(document.querySelector(".ll-integrated-chat-panel")).toBeNull();
    expect(
      document.querySelector<HTMLElement>(".chat-message-wrapper")?.style
        .display,
    ).toBe("grid");
  });

  it("preserves native exceptions even when the visibility subscriber fails", () => {
    const { runtime, chatWindow, setChannel } = fixture();
    const changed = vi.fn();
    const host = watchIntegratedChatHost("Lootlog", changed, runtime);
    changed.mockImplementation(() => {
      throw new Error("observer");
    });
    const nativeError = new Error("native");
    setChannel.mockImplementation(() => {
      throw nativeError;
    });
    expect(() => chatWindow.setChannel("LOCAL")).toThrow(nativeError);
    expect(setChannel).toHaveBeenCalledTimes(1);
    host.dispose();
  });

  it("remounts after replacement of the whole native host and falls back when removed", () => {
    vi.useFakeTimers();
    const { runtime } = fixture();
    const changed = vi.fn();
    const host = watchIntegratedChatHost("Lootlog", changed, runtime);
    const previousPanel = document.querySelector(".ll-integrated-chat-panel");
    fixture();
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll(".ll-integrated-chat-panel")).toHaveLength(
      1,
    );
    expect(document.querySelector(".ll-integrated-chat-panel")).not.toBe(
      previousPanel,
    );
    document.body.replaceChildren();
    vi.advanceTimersByTime(1000);
    expect(changed.mock.lastCall?.[0]).toBeNull();
    host.dispose();
  });
});
