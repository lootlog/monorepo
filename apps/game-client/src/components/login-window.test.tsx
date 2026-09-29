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
import { useLoginWebsiteStore } from "@/hooks/auth/use-login-state";
import {
  resetExtensionLoginWindow,
  useWindowsStore,
} from "@/store/windows.store";
import { useSettingsStore } from "@/store/settings.store";
import { LOOTLOG_APP_URL } from "@/config/app";
import { resolveDefaultWindowPosition } from "@/components/draggable-window/window-default-placement";

const SIGNED_OUT = "Zaloguj się na stronie Lootloga, a potem wróć do gry";

const COOKIES_BLOCKED =
  /przeglądarka blokuje pliki cookie innych firm dla lootlog\.pl/u;

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

/** Follows the website link and comes back to the game, as a player would. */
const roundTripThroughWebsite = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  const link = screen.getByRole("link", { name: "Otwórz stronę Lootloga" });
  // jsdom cannot open the tab; only the click handler matters here.
  link.addEventListener("click", (event) => event.preventDefault());
  await user.click(link);
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });
};

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
  useLoginWebsiteStore.setState({ websiteOpened: false });
  restorePlatform?.();
  restorePlatform = undefined;
  vi.restoreAllMocks();
});

describe("login window", () => {
  it("points at blocked cookies when the userscript still reads no session after the website, and hides once signed in", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    expect(screen.queryByText(COOKIES_BLOCKED)).toBeNull();

    await roundTripThroughWebsite(user);

    await screen.findByText(COOKIES_BLOCKED);
    expect(
      screen.getByRole("link", { name: "Więcej pomocy z logowaniem" }),
    ).toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValue(Response.json(signedInSession));
    await user.click(screen.getByRole("button", { name: "Sprawdź sesję" }));
    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());

    // A later confirmed sign-out brings the window back.
    vi.mocked(fetch).mockResolvedValue(Response.json(null));
    act(() => authClient.$store.notify("$sessionSignal"));
    await screen.findByRole("region");
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

  it("never blames cookies for an extension player, whose session does not need them", async () => {
    restorePlatform = asExtension();
    const user = userEvent.setup();
    renderLogin();

    await screen.findByText(new RegExp(SIGNED_OUT, "u"));
    expect(
      screen.getByRole("link", { name: "Otwórz stronę Lootloga" }),
    ).toHaveAttribute("href", LOOTLOG_APP_URL);
    await roundTripThroughWebsite(user);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(SIGNED_OUT),
    );
    expect(screen.queryByText(COOKIES_BLOCKED)).toBeNull();
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
