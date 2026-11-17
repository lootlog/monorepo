import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogsSettingsTab } from "./logs-settings-tab";
import { LOGS_STORAGE_KEY, useLogsStore } from "@/store/logs.store";
import { useSettingsStore } from "@/store/settings.store";
import { captureRuntimeMessages } from "@/test/test-runtime-window";

const mockClipboardWriteText = vi.fn<Clipboard["writeText"]>();

const mockCreateObjectURL = vi.fn<typeof URL.createObjectURL>();

const mockRevokeObjectURL = vi.fn<typeof URL.revokeObjectURL>();

const mockAnchorClick = vi.fn<HTMLAnchorElement["click"]>();

let messages: string[];

describe("LogsSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messages = captureRuntimeMessages();
    window.localStorage.removeItem(LOGS_STORAGE_KEY);
    useLogsStore.getState().clearActions();
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);

    const clipboard = {
      writeText: mockClipboardWriteText,
    };

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: mockCreateObjectURL.mockReturnValue("blob:logs"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: mockRevokeObjectURL,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value: mockAnchorClick,
    });

    useLogsStore.setState({
      actions: [
        {
          id: "action-1",
          actionType: "create_timer",
          status: "partial",
          payload: { guildIds: ["guild-1"] },
          details: { totalRequests: 1, successCount: 1, failureCount: 0 },
          createdAt: "2026-04-16T10:00:00.000Z",
          requests: [
            {
              id: "api-1",
              status: "error",
              method: "POST",
              endpoint: "/timers/auto",
              payload: { guildId: "guild-1" },
              response: { message: "conflict" },
              statusCode: 409,
              createdAt: "2026-04-16T10:00:01.000Z",
            },
          ],
        },
        {
          id: "action-2",
          actionType: "create_loot",
          status: "success",
          payload: { source: "FIGHT" },
          details: { totalRequests: 1, successCount: 1, failureCount: 0 },
          createdAt: "2026-04-16T10:00:02.000Z",
          requests: [
            {
              id: "api-2",
              status: "success",
              method: "POST",
              endpoint: "/loots",
              payload: { source: "FIGHT" },
              response: { id: 15 },
              statusCode: 201,
              createdAt: "2026-04-16T10:00:03.000Z",
            },
          ],
        },
      ],
    });
  });

  it("enables loot debug console logging", async () => {
    const user = userEvent.setup();
    const { container } = render(<LogsSettingsTab />);
    const toggle = container.querySelector("#loot-debug-logging");

    expect(toggle).toBeInTheDocument();
    expect(useSettingsStore.getState().lootDebugLoggingEnabled).toBe(false);

    if (!toggle) {
      throw new Error("Loot debug logging toggle was not rendered");
    }

    await user.click(toggle);

    expect(useSettingsStore.getState().lootDebugLoggingEnabled).toBe(true);
  });

  it("filters actions by search, type and status", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.type(screen.getByPlaceholderText("Szukaj w logach"), "/loots");

    expect(screen.getByText("Dodanie łupu")).toBeInTheDocument();
    expect(screen.queryByText("Dodanie timera")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Szukaj w logach"));
    await user.click(screen.getByLabelText("Typ akcji"));
    const actionTypeListbox = screen.getByRole("listbox");
    await user.click(within(actionTypeListbox).getByText("Dodanie timera"));

    const rows = screen.getAllByRole("row");

    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("Dodanie timera")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("Dodanie łupu")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Status akcji"));
    await user.click(screen.getByText("Błąd"));

    expect(
      screen.getByText("Żadna akcja nie pasuje do filtrów."),
    ).toBeInTheDocument();
  });

  it("shows requests only after clicking an action row", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    expect(screen.queryByText("/timers/auto")).not.toBeInTheDocument();

    await user.click(screen.getByText("Dodanie timera"));

    expect(screen.getByText("/timers/auto")).toBeInTheDocument();
    expect(screen.getByText("Dodanie timera").closest("tr")).toHaveAttribute(
      "data-state",
      "expanded-detail",
    );
  });

  it("toggles action details with the keyboard without toggling when copying", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    const [toggle] = screen.getAllByRole("button", {
      name: "Przełącz szczegóły akcji",
    });

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("/loots")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("/loots")).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Kopiuj akcję" })[0],
    );

    await waitFor(() => {
      expect(messages).toContain("Akcja skopiowana do schowka");
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("copies full action JSON to clipboard", async () => {
    mockClipboardWriteText.mockResolvedValue(undefined);

    render(<LogsSettingsTab />);

    const copyButtons = screen.getAllByRole("button", { name: "Kopiuj akcję" });

    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[0]);

    expect(screen.queryByText("/loots")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });

    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      '"actionType": "create_loot"',
    );
    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      '"endpoint": "/loots"',
    );
    expect(messages).toEqual(["Akcja skopiowana do schowka"]);
  });

  it("exports currently visible actions to json", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.type(screen.getByPlaceholderText("Szukaj w logach"), "/loots");
    await user.click(screen.getByRole("button", { name: "Eksportuj JSON" }));

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockAnchorClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:logs");

    const exportedBlob = mockCreateObjectURL.mock.calls[0][0];

    if (!(exportedBlob instanceof Blob))
      throw new Error("Expected exported JSON blob");
    const exportedText = await exportedBlob.text();

    expect(exportedText).toContain('"searchTerm": "/loots"');
    expect(exportedText).toContain('"actionType": "create_loot"');
    expect(exportedText).toContain('"endpoint": "/loots"');
    expect(exportedText).not.toContain('"actionType": "create_timer"');
    expect(messages).toContain("Logi wyeksportowane do pliku");
  });

  it("shows request details and request copy button after expansion", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.click(screen.getByText("Dodanie łupu"));

    await screen.findByText("/loots");

    expect(screen.queryByText("Odpowiedź")).not.toBeInTheDocument();

    await user.click(screen.getByText("/loots"));

    expect(screen.getByText("Wysłane dane")).toBeInTheDocument();
    expect(screen.getByText("Odpowiedź")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kopiuj żądanie" }));

    await waitFor(() => {
      expect(messages).toContain("Żądanie skopiowane do schowka");
    });
    expect(screen.getByText("Odpowiedź")).toBeInTheDocument();
  });
});
