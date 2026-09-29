import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginWindow } from "./login-window";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import {
  configureGameClientPlatform,
  createGameRealtimeClient,
} from "@/lib/game-client-platform";
import { cancelLoginHandoff } from "@/hooks/auth/login-handoff";
import {
  resetExtensionLoginWindow,
  useWindowsStore,
} from "@/store/windows.store";
import { useSettingsStore } from "@/store/settings.store";
import { LOOTLOG_APP_URL } from "@/config/app";
import { resolveDefaultWindowPosition } from "@/components/draggable-window/window-default-placement";

const APP_ORIGIN = new URL(LOOTLOG_APP_URL).origin;

const SIGNED_OUT = "Zaloguj się przez Discord, aby połączyć dodatek";

const signedInSession = {
  user: {
    id: "user",
    name: "Player",
    email: "player@example.test",
    emailVerified: false,
    discordId: "123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  session: {
    id: "session",
    userId: "user",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const renderLogin = () =>
  render(
    <TooltipProvider>
      <LoginWindow />
    </TooltipProvider>,
  );

const asExtension = () =>
  configureGameClientPlatform({
    fetch: (input, init) => globalThis.fetch(input, init),
    createRealtime: createGameRealtimeClient,
  });

const requestUrl = (input: Parameters<typeof fetch>[0]) =>
  input instanceof Request ? input.url : String(input);

/** Opens the popup handoff and returns the state it sent to the web app. */
const startHandoff = async (user: ReturnType<typeof userEvent.setup>) => {
  // Any open window stands in for the popup; the client only polls `closed`.
  const open = vi.spyOn(window, "open").mockReturnValue(window);

  await user.click(screen.getByRole("button", { name: "Zaloguj się" }));
  const url = new URL(String(open.mock.calls[0]?.[0]));

  return { url, state: url.searchParams.get("state") ?? "" };
};

type HandoffMessage = { type: string; state: string; code: string };

const postFromWebApp = (data: HandoffMessage, origin = APP_ORIGIN) =>
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  });

let restorePlatform: (() => void) | undefined;

beforeEach(async () => {
  resetExtensionLoginWindow();
  useSettingsStore.setState({ animationEffectsEnabled: false });
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(Response.json(null)),
  );
  await act(async () => {
    await authClient.getSession({ query: { disableCookieCache: true } });
  });
});

afterEach(() => {
  cancelLoginHandoff();
  restorePlatform?.();
  restorePlatform = undefined;
  vi.restoreAllMocks();
});

describe("login window", () => {
  it("redeems only the web app's answer to its own popup and hides while signed in", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    const { url, state } = await startHandoff(user);

    expect(url.origin + url.pathname).toBe(`${APP_ORIGIN}/connect`);
    expect(url.searchParams.get("origin")).toBe(window.location.origin);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Dokończ logowanie w otwartym oknie Lootloga.",
    );

    const exchange = vi.mocked(fetch);
    exchange.mockClear();

    const message = {
      type: "lootlog:game-client-handoff",
      state,
      code: "c0de",
    };

    postFromWebApp(message, "https://attacker.example");
    postFromWebApp({ ...message, state: "another-request" });
    expect(exchange).not.toHaveBeenCalled();

    let signedIn = false;
    exchange.mockImplementation(async (input) => {
      if (requestUrl(input).endsWith("/idp/game-client/exchange")) {
        signedIn = true;

        return Response.json({ status: "connected" });
      }

      return Response.json(signedIn ? signedInSession : null);
    });
    postFromWebApp(message);

    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
    const [input, init] = exchange.mock.calls[0] ?? [];
    expect(requestUrl(input ?? "")).toBe(
      "http://localhost/api/auth/idp/game-client/exchange",
    );
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ code: "c0de" }),
    });

    // A later confirmed sign-out brings the window back with a fresh handoff.
    signedIn = false;
    act(() => authClient.$store.notify("$sessionSignal"));
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
  });

  it("explains blocked cookies when an accepted handoff still yields no session", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    const { state } = await startHandoff(user);
    vi.mocked(fetch).mockImplementation(async (input) =>
      Response.json(
        requestUrl(input).endsWith("/game-client/exchange")
          ? { status: "connected" }
          : null,
      ),
    );

    postFromWebApp({
      type: "lootlog:game-client-handoff",
      state,
      code: "c0de",
    });

    await screen.findByText(
      /przeglądarka nie pozwala zapisać sesji dodatku na stronie Margonem/u,
    );
    expect(
      screen.getByRole("link", { name: "Więcej pomocy z logowaniem" }),
    ).toBeInTheDocument();
  });

  it("offers the popup as a link that keeps its opener when the browser blocks it", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    vi.spyOn(window, "open").mockReturnValue(null);

    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    const link = screen.getByRole("link", { name: "Otwórz okno logowania" });
    expect(link).toHaveAttribute("rel", "opener");
    expect(link.getAttribute("href")).toContain(`${APP_ORIGIN}/connect?`);
  });

  it("tells a failed session check apart from a missing session", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: "Unavailable" }, { status: 503 }),
    );

    await user.click(screen.getByRole("button", { name: "Sprawdź sesję" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Nie udało się sprawdzić sesji Lootloga",
      ),
    );
    vi.mocked(fetch).mockResolvedValue(Response.json(null));
    await user.click(screen.getByRole("button", { name: "Sprawdź sesję" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(SIGNED_OUT),
    );
  });

  it("sends extension players to the website, where their first-party session works", async () => {
    restorePlatform = asExtension();
    renderLogin();

    await screen.findByText(/Zaloguj się na stronie Lootloga/u);
    expect(
      screen.getByRole("link", { name: "Otwórz stronę Lootloga" }),
    ).toHaveAttribute("href", LOOTLOG_APP_URL);
  });

  it("closes by keyboard, stays dismissed across remounts with a way back, and resets position on the next runtime", async () => {
    restorePlatform = asExtension();
    const user = userEvent.setup();
    const view = renderLogin();
    const close = screen.getByRole("button", { name: "Zamknij okno" });
    close.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("region")).toBeNull();
    view.unmount();
    const remounted = renderLogin();
    expect(screen.queryByRole("region")).toBeNull();

    // The launcher takes the quick access bar's place, even before the player
    // has ever moved that bar.
    const launcher = screen.getByRole("button", {
      name: "Zaloguj się do Lootloga",
    });

    const quickAccessPosition = resolveDefaultWindowPosition(
      "quick-access",
      (id) => useWindowsStore.getState()[id].size,
      { width: window.innerWidth, height: window.innerHeight },
    );

    expect(launcher).toHaveStyle({
      left: `${quickAccessPosition.x}px`,
      top: `${quickAccessPosition.y}px`,
    });

    // Reopening is the player's own action, so focus moves in and Escape
    // closes the window instead of reaching the game.
    await user.click(launcher);
    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Zaloguj się do Lootloga" }),
    ).toBeNull();
    await waitFor(() =>
      expect(
        remounted.container
          .querySelector("#ll-extension-login")
          ?.contains(document.activeElement),
      ).toBe(true),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Zaloguj się do Lootloga" }),
    );
    remounted.unmount();
    useWindowsStore.getState().setPosition("extension-login", { x: 10, y: 20 });
    resetExtensionLoginWindow();
    const next = renderLogin();
    expect(screen.getByRole("region")).toBeInTheDocument();

    const loginPosition = resolveDefaultWindowPosition(
      "extension-login",
      (id) => useWindowsStore.getState()[id].size,
      { width: window.innerWidth, height: window.innerHeight },
    );

    expect(next.container.querySelector("#ll-extension-login")).toHaveStyle({
      left: `${loginPosition.x}px`,
      top: `${loginPosition.y}px`,
    });
  });

  it("supports keyboard activation of the shared lock and opacity controls", async () => {
    const user = userEvent.setup();
    renderLogin();
    screen.getByRole("button", { name: "Zablokuj okno" }).focus();
    await user.keyboard("{Enter}");
    expect(useWindowsStore.getState()["extension-login"].locked).toBe(true);
    screen.getByRole("button", { name: "Odblokuj okno" }).focus();
    await user.keyboard(" ");
    expect(useWindowsStore.getState()["extension-login"].locked).toBe(false);
    screen.getByRole("button", { name: /^Krycie tła: 4\/5/ }).focus();
    await user.keyboard("{Enter}");
    expect(useWindowsStore.getState()["extension-login"].opacity).toBe(5);
  });

  it("keeps the window within a narrow viewport", () => {
    const originalWidth = window.innerWidth;
    vi.stubGlobal("innerWidth", 280);
    resetExtensionLoginWindow();
    const view = renderLogin();
    expect(view.container.querySelector("#ll-extension-login")).toHaveStyle({
      width: "280px",
      left: "0px",
    });
    vi.stubGlobal("innerWidth", originalWidth);
  });
});
