// Native wrappers forward foreign values unchanged; parsing would alter the game contract.
// oxlint-disable-next-line anti-slop/no-unknown-returns
type NativeMethod = (...args: unknown[]) => unknown;
type ChatOwner = { setChannel?: NativeMethod; focus?: NativeMethod };
type ChatHostWindow = Window & {
  Engine?: {
    chatController?: {
      getChatWindow?: () => ChatOwner;
      getChatInputWrapper?: () => ChatOwner;
    };
  };
};

export type IntegratedChatHost = {
  target: HTMLElement;
  selected: boolean;
  visible: boolean;
};

function getNativeChatOwners(runtime: ChatHostWindow) {
  const controller = runtime.Engine?.chatController;
  const chatWindow = controller?.getChatWindow?.();
  const chatInput = controller?.getChatInputWrapper?.();
  if (!chatWindow?.setChannel || !chatInput?.setChannel || !chatInput.focus)
    return null;
  return { chatWindow, chatInput };
}

// TemplatesData.new-chat-window owns these three direct children in NI.
// No native channel is registered: game channel names remain protocol-owned.
export function watchIntegratedChatHost(
  label: string,
  onChange: (host: IntegratedChatHost | null) => void,
  runtime: ChatHostWindow = window,
) {
  const doc = runtime.document;
  let current: HTMLElement | null = null;
  let tabs: HTMLElement | null = null;
  let currentWindow: ChatOwner | undefined;
  let currentInput: ChatOwner | undefined;
  let cleanup: (() => void) | undefined;
  let select = () => {};
  let selected = true;
  let stopped = false;

  const refresh = () => {
    if (stopped) return;
    const owners = getNativeChatOwners(runtime);
    const chatWindow = owners?.chatWindow;
    const chatInput = owners?.chatInput;
    const host = owners
      ? doc.querySelector<HTMLElement>(".new-chat-window")
      : null;
    const nextTabs =
      host?.querySelector<HTMLElement>(":scope > .chat-channel-card-wrapper") ??
      null;
    if (
      host === current &&
      tabs === nextTabs &&
      chatWindow === currentWindow &&
      chatInput === currentInput
    )
      return;
    cleanup?.();
    cleanup = undefined;
    current = host;
    tabs = nextTabs;
    currentWindow = chatWindow;
    currentInput = chatInput;
    select = () => {};
    const messages = host?.querySelector<HTMLElement>(
      ":scope > .chat-message-wrapper",
    );
    const input = host?.querySelector<HTMLElement>(
      ":scope > .chat-input-wrapper",
    );
    if (!host || !nextTabs || !messages || !input || !owners) {
      current = null;
      onChange(null);
      return;
    }
    const button = doc.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.className = "card ll-integrated-chat-tab";
    button.style.cssText =
      "position:relative;cursor:pointer;box-sizing:border-box;width:24px;height:24px;flex:0 0 24px;align-self:center;display:flex;align-items:center;justify-content:center;padding:0;color:inherit;font:inherit";
    const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const outline = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    outline.setAttribute(
      "d",
      "M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z",
    );
    icon.append(outline);
    button.append(icon);
    const panel = doc.createElement("div");
    // NI's global wheel handler allows browser scrolling in this subtree.
    panel.className = "ll-integrated-chat-panel unblock-scroll";
    panel.style.cssText =
      "position:absolute;left:0;right:0;bottom:0;min-height:0;overflow:hidden;display:flex;flex-direction:column";
    // NI positions this left-aligned window with an intrinsic width. Adding a
    // tab must not expand it beyond the native column's containing block.
    const originalRight = host.style.right;
    host.style.right = "0px";
    const displays = [messages.style.display, input.style.display];
    let intersecting = false;
    const update = () => {
      messages.style.display = selected ? "none" : (displays[0] ?? "");
      input.style.display = selected ? "none" : (displays[1] ?? "");
      panel.style.display = selected ? "flex" : "none";
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("active", selected);
      panel.style.top = `${nextTabs.offsetTop + nextTabs.offsetHeight}px`;
      onChange({ target: panel, selected, visible: selected && intersecting });
    };
    select = () => {
      selected = true;
      update();
    };
    const restore = () => {
      if (!selected) return;
      selected = false;
      update();
    };
    const nativeClick = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".chat-channel-card")
      )
        restore();
    };
    const restoreCallbacks: (() => void)[] = [];
    const wrap = (owner: ChatOwner | undefined, key: keyof ChatOwner) => {
      const original = owner?.[key];
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Optional foreign runtime capability.
      if (!owner || typeof original !== "function") return;
      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Preserve the caller's native receiver.
      const wrapped: NativeMethod = function (this: unknown, ...args) {
        // UI failures cannot alter the native receiver, result, exception or calls.
        try {
          restore();
        } catch {
          /* The native method must still run. */
        }
        return original.apply(this, args);
      };
      owner[key] = wrapped;
      restoreCallbacks.push(() => {
        if (owner[key] === wrapped) owner[key] = original;
      });
    };
    wrap(chatWindow, "setChannel");
    wrap(chatInput, "setChannel");
    wrap(chatInput, "focus");
    button.addEventListener("click", select);
    nextTabs.addEventListener("click", nativeClick, true);
    nextTabs.append(button);
    host.append(panel);
    const visibility = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false;
      onChange({ target: panel, selected, visible: selected && intersecting });
    });
    visibility.observe(panel);
    const resize = new ResizeObserver(() => {
      panel.style.top = `${nextTabs.offsetTop + nextTabs.offsetHeight}px`;
    });
    resize.observe(nextTabs);
    const observer = new MutationObserver(() => {
      if (!panel.isConnected || !messages.isConnected || !input.isConnected)
        current = null;
      refresh();
    });
    observer.observe(host, { childList: true });
    cleanup = () => {
      observer.disconnect();
      resize.disconnect();
      visibility.disconnect();
      restoreCallbacks.forEach((restoreCallback) => restoreCallback());
      nextTabs.removeEventListener("click", nativeClick, true);
      messages.style.display = displays[0] ?? "";
      input.style.display = displays[1] ?? "";
      host.style.right = originalRight;
      button.remove();
      panel.remove();
    };
    update();
  };
  // Identity-only polling catches replacement of the whole NI interface without
  // observing the game DOM subtree (which changes on every movement).
  const timer = runtime.setInterval(refresh, 1000);
  refresh();
  return {
    select: () => select(),
    dispose: () => {
      stopped = true;
      runtime.clearInterval(timer);
      cleanup?.();
    },
  };
}
