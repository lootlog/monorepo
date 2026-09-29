import { Option, Schema } from "effect";
import { create } from "zustand";
import { GameClientHandoffMessage } from "@lootlog/protocol/game-client-handoff";
import { LOOTLOG_APP_URL } from "@/config/app";
import { AUTH_SERVICE_URL } from "@/config/auth";
import { authClient } from "@/lib/auth-client";
import { gameClientFetch } from "@/lib/game-client-platform";

/**
 * Popup login for the userscript. The Margonem page cannot read Lootlog's
 * first-party session when the browser blocks third-party cookies, so the web
 * app (first-party in its own window) posts a single-use code back to this
 * page, and the auth service redeems it for a session cookie partitioned to
 * Margonem. The code never appears in a URL and the page never sees the
 * session token.
 */

const POPUP_FEATURES = "popup,width=480,height=720";

const POPUP_CLOSED_POLL_MS = 1_000;

export type LoginHandoff =
  | { status: "idle" }
  | { status: "waiting"; url: string; popupBlocked: boolean }
  | { status: "exchanging" }
  /** The auth service set the cookie; the next session read confirms it. */
  | { status: "exchanged" }
  | { status: "failed"; reason: "expired" | "unavailable" };

export const useLoginHandoffStore = create<{ handoff: LoginHandoff }>(() => ({
  handoff: { status: "idle" },
}));

const setHandoff = (handoff: LoginHandoff) =>
  useLoginHandoffStore.setState({ handoff });

let stopWaiting: (() => void) | undefined;

const createRequestState = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const decodeHandoffMessage = Schema.decodeUnknownOption(
  GameClientHandoffMessage,
);

/**
 * Returns the code only for a handoff this page asked for, posted by the web
 * app itself.
 */
export const readHandoffCode = (
  event: Pick<MessageEvent, "data" | "origin">,
  expected: { origin: string; state: string },
): string | null => {
  if (event.origin !== expected.origin) return null;
  const message = Option.getOrNull(decodeHandoffMessage(event.data));

  return message?.state === expected.state ? message.code : null;
};

const exchangeCode = async (code: string) => {
  setHandoff({ status: "exchanging" });

  try {
    const response = await gameClientFetch(
      `${AUTH_SERVICE_URL}/idp/game-client/exchange`,
      {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      },
    );

    if (!response.ok) {
      setHandoff({
        status: "failed",
        reason: response.status === 400 ? "expired" : "unavailable",
      });

      return;
    }
  } catch {
    setHandoff({ status: "failed", reason: "unavailable" });

    return;
  }

  setHandoff({ status: "exchanged" });
  authClient.$store.notify("$sessionSignal");
};

export const cancelLoginHandoff = () => {
  stopWaiting?.();
  stopWaiting = undefined;

  if (useLoginHandoffStore.getState().handoff.status !== "idle")
    setHandoff({ status: "idle" });
};

/** Must run inside the click handler, or the browser blocks the popup. */
export const startLoginHandoff = () => {
  stopWaiting?.();

  const state = createRequestState();
  const appOrigin = new URL(LOOTLOG_APP_URL).origin;
  const url = new URL("/connect", LOOTLOG_APP_URL);
  url.searchParams.set("origin", window.location.origin);
  url.searchParams.set("state", state);

  const popup = window.open(url, "lootlog-connect", POPUP_FEATURES);

  const handleMessage = (event: MessageEvent) => {
    const code = readHandoffCode(event, { origin: appOrigin, state });

    if (code === null) return;
    stopWaiting?.();
    stopWaiting = undefined;
    void exchangeCode(code);
  };

  // A closed popup can no longer answer, so the window stops waiting for it.
  const closedPoll =
    popup === null
      ? undefined
      : setInterval(() => {
          if (popup.closed) cancelLoginHandoff();
        }, POPUP_CLOSED_POLL_MS);

  window.addEventListener("message", handleMessage);
  stopWaiting = () => {
    window.removeEventListener("message", handleMessage);
    clearInterval(closedPoll);
  };

  setHandoff({
    status: "waiting",
    url: url.href,
    popupBlocked: popup === null,
  });
};
