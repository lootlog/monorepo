// @vitest-environment happy-dom
import {
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
import { GlobalContextProvider } from "@/contexts/global-context";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import i18n from "@/i18n/config";
import { GlobalModals } from "./global-modals";

const ModalControls = () => {
  const { createGuildModal, installAddonModal } = useGlobalContext();
  return (
    <>
      <button onClick={() => createGuildModal.dispatch({ type: "OPEN" })}>
        Create
      </button>
      <button onClick={() => installAddonModal.dispatch({ type: "OPEN" })}>
        Install
      </button>
      <GlobalModals />
    </>
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it("opens deferred modals, restores focus and preserves create form state after closing", async () => {
  vi.stubEnv("VITE_ADDON_INSTALL_URL", "https://lootlog.test/addon.user.js");
  const fetchGuilds = vi.fn(async () => Response.json([]));
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

    const create = screen.getByRole("button", { name: "Create" });
    create.focus();
    fireEvent.click(create);
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

    const install = screen.getByRole("button", { name: "Install" });
    for (let opening = 0; opening < 2; opening++) {
      install.focus();
      fireEvent.click(install);
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
    }
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});
