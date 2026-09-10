// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import { GlobalContextProvider } from "@/contexts/global-provider";
import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { InstallButton } from "@/components/layout/install-button";
import i18n from "@/i18n/config";
import { GlobalModals } from "./global-modals";

const ModalControls = () => (
  <>
    <GuildNavCreate />
    <InstallButton />
    <GlobalModals />
  </>
);

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("opens deferred modals, restores focus and preserves create form state after closing", async () => {
  vi.stubEnv("VITE_ADDON_INSTALL_URL", "https://lootlog.test/addon.user.js");

  const fetchGuilds = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json([])),
  );

  const restore = configureApiClients({
    main: { baseUrl: "https://lootlog.test", fetch: fetchGuilds },
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  try {
    render(
      <QueryClientProvider client={client}>
        <GlobalContextProvider>
          <ModalControls />
        </GlobalContextProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchGuilds).not.toHaveBeenCalled();

    const create = screen.getByRole("button", {
      name: i18n.t("ui.tooltips.createLootlog"),
    });

    create.focus();
    await act(async () => {
      fireEvent.click(create);
      await vi.dynamicImportSettled();
    });

    const dialog = await screen.findByRole(
      "dialog",
      { name: i18n.t("ui.modals.createLootlog.title") },
      { timeout: 5000 },
    );

    const search = within(dialog).getByPlaceholderText(
      i18n.t("ui.modals.createLootlog.searchPlaceholder"),
    );

    fireEvent.change(search, { target: { value: "test guild" } });
    await waitFor(() => expect(fetchGuilds).toHaveBeenCalledTimes(1));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(create));

    fireEvent.click(create);

    const reopened = await screen.findByRole("dialog", {
      name: i18n.t("ui.modals.createLootlog.title"),
    });

    expect(within(reopened).getByDisplayValue("test guild")).toBeTruthy();
    fireEvent.click(within(reopened).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const install = screen.getByRole("button", {
      name: i18n.t("ui.tooltips.installAddon"),
    });

    const openAndCloseInstaller = async () => {
      install.focus();
      await act(async () => {
        fireEvent.click(install);
        await vi.dynamicImportSettled();
      });

      const installer = await screen.findByRole("dialog", {
        name: i18n.t("ui.modals.installAddon.title"),
      });

      expect(
        within(installer)
          .getByRole("link", {
            name: i18n.t("ui.actions.installAddon"),
          })
          .getAttribute("href"),
      ).toBe("https://lootlog.test/addon.user.js");
      fireEvent.click(within(installer).getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(install));
    };

    await openAndCloseInstaller();
    await openAndCloseInstaller();
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});

it("cancels the pending guild search when the modal is unmounted", async () => {
  const restore = configureApiClients({
    main: {
      baseUrl: "https://lootlog.test",
      fetch: () => Promise.resolve(Response.json([])),
    },
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  try {
    render(
      <QueryClientProvider client={client}>
        <GlobalContextProvider>
          <ModalControls />
        </GlobalContextProvider>
      </QueryClientProvider>,
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: i18n.t("ui.tooltips.createLootlog"),
        }),
      );
      await vi.dynamicImportSettled();
    });

    const dialog = await screen.findByRole("dialog", {
      name: i18n.t("ui.modals.createLootlog.title"),
    });

    vi.useFakeTimers();
    const schedule = vi.spyOn(globalThis, "setTimeout");
    const cancel = vi.spyOn(globalThis, "clearTimeout");
    fireEvent.change(
      within(dialog).getByPlaceholderText(
        i18n.t("ui.modals.createLootlog.searchPlaceholder"),
      ),
      { target: { value: "pending search" } },
    );

    const searchTimerIndex = schedule.mock.calls.findIndex(
      ([, delay]) => delay === 200,
    );

    expect(searchTimerIndex).toBeGreaterThanOrEqual(0);
    const searchTimer = schedule.mock.results[searchTimerIndex]?.value;
    cleanup();
    expect(cancel).toHaveBeenCalledWith(searchTimer);
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});
