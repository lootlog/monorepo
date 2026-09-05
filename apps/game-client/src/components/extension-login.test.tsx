import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionLogin } from "./extension-login";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import {
  resetExtensionLoginWindow,
  useWindowsStore,
} from "@/store/windows.store";
import { useSettingsStore } from "@/store/settings.store";
import { LOOTLOG_APP_URL } from "@/config/app";

const renderLogin = () =>
  render(
    <TooltipProvider>
      <ExtensionLogin />
    </TooltipProvider>,
  );

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

afterEach(() => vi.restoreAllMocks());

describe("extension login window", () => {
  it("offers website login, blocks duplicate checks and distinguishes errors from a missing session", async () => {
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Sprawdź sesję" }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", LOOTLOG_APP_URL);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Zaloguj się na stronie Lootloga",
    );

    let complete: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    await user.click(screen.getByRole("button", { name: "Sprawdź sesję" }));
    expect(
      screen.getByRole("button", { name: "Sprawdzanie sesji…" }),
    ).toBeDisabled();
    act(() => {
      complete(Response.json({ message: "Unavailable" }, { status: 503 }));
    });
    await screen.findByText(
      "Nie udało się sprawdzić sesji Lootloga. Spróbuj ponownie.",
    );

    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(Response.json(null)),
    );
    await user.click(screen.getByRole("button", { name: "Sprawdź sesję" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Zaloguj się na stronie Lootloga",
      ),
    );
  });

  it("closes by keyboard, stays dismissed across remounts and resets position on the next runtime", async () => {
    const user = userEvent.setup();
    const view = renderLogin();
    const close = screen.getByRole("button", { name: "Zamknij okno" });
    close.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("region")).toBeNull();
    view.unmount();
    const remounted = renderLogin();
    expect(screen.queryByRole("region")).toBeNull();
    remounted.unmount();
    useWindowsStore.getState().setPosition("extension-login", { x: 10, y: 20 });
    resetExtensionLoginWindow();
    renderLogin();
    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(useWindowsStore.getState()["extension-login"].position).toEqual({
      x: (window.innerWidth - 360) / 2,
      y: (window.innerHeight - 180) / 2,
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
    screen.getByRole("button", { name: "Zmień przezroczystość" }).focus();
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
