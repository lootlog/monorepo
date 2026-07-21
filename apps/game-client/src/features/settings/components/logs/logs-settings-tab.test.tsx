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

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
const mockClipboardWriteText = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockAnchorClick = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}));

describe("LogsSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    await user.click(
      within(screen.getByRole("listbox")).getByText("Dodanie timera"),
    );

    expect(screen.getAllByText("Dodanie timera").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dodanie łupu")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Status akcji"));
    await user.click(screen.getByText("Błąd"));

    expect(
      screen.getByText("Brak akcji pasujących do aktualnych filtrów."),
    ).toBeInTheDocument();
  });

  it("shows selected values inside both filter selects", () => {
    render(<LogsSettingsTab />);

    expect(
      screen.getByRole("combobox", { name: "Typ akcji" }),
    ).toHaveTextContent("Wszystkie akcje");
    expect(
      screen.getByRole("combobox", { name: "Status akcji" }),
    ).toHaveTextContent("Wszystkie statusy");
  });

  it("opens the action type dropdown on click", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.click(screen.getByRole("combobox", { name: "Typ akcji" }));

    const listbox = screen.getByRole("listbox");

    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByText("Wszystkie akcje")).toBeInTheDocument();
    expect(within(listbox).getByText("Dodanie timera")).toBeInTheDocument();
  });

  it("closes the action type dropdown after clicking its trigger again", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    const actionTypeSelect = screen.getByRole("combobox", {
      name: "Typ akcji",
    });

    await user.click(actionTypeSelect);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(actionTypeSelect, { button: 0 });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("switches between filter dropdowns without keeping the previous one open", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.click(screen.getByRole("combobox", { name: "Typ akcji" }));
    let listbox = screen.getByRole("listbox");

    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByText("Dodanie timera")).toBeInTheDocument();

    const statusSelect = screen.getByRole("combobox", {
      name: "Status akcji",
      hidden: true,
    });

    fireEvent.pointerDown(statusSelect, { button: 0 });
    fireEvent.pointerUp(statusSelect, { button: 0 });
    fireEvent.click(statusSelect, { button: 0 });

    listbox = await screen.findByRole("listbox");

    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByText("Wszystkie statusy")).toBeInTheDocument();
    expect(within(listbox).getByText("Błąd")).toBeInTheDocument();
    expect(
      within(listbox).queryByText("Dodanie timera"),
    ).not.toBeInTheDocument();
  });

  it("shows requests only after expanding an action", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    expect(screen.queryByText("POST /timers/auto")).not.toBeInTheDocument();

    await user.click(screen.getByText("Dodanie timera"));

    expect(screen.getByText("POST /timers/auto")).toBeInTheDocument();
  });

  it("copies full action JSON to clipboard", async () => {
    mockClipboardWriteText.mockResolvedValue(undefined);

    render(<LogsSettingsTab />);

    const copyButtons = screen.getAllByRole("button", { name: "Kopiuj akcję" });

    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[0]);

    expect(screen.queryByText("POST /loots")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });

    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      '"actionType": "create_loot"',
    );
    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      '"endpoint": "/loots"',
    );
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Akcja skopiowana do schowka",
    );
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("exports currently visible actions to json", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.type(screen.getByPlaceholderText("Szukaj w logach"), "/loots");
    await user.click(screen.getByRole("button", { name: "Eksportuj JSON" }));

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockAnchorClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:logs");

    const exportedBlob = mockCreateObjectURL.mock.calls[0][0] as Blob;
    const exportedText = await exportedBlob.text();

    expect(exportedText).toContain('"searchTerm": "/loots"');
    expect(exportedText).toContain('"actionType": "create_loot"');
    expect(exportedText).toContain('"endpoint": "/loots"');
    expect(exportedText).not.toContain('"actionType": "create_timer"');
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Logi wyeksportowane do pliku",
    );
  });

  it("shows request details and request copy button after expansion", async () => {
    const user = userEvent.setup();

    render(<LogsSettingsTab />);

    await user.click(
      screen.getByRole("button", {
        name: /Dodanie łupu/,
      }),
    );

    await screen.findByText("POST /loots");

    const copyButton = await screen.findByRole("button", {
      name: "Kopiuj request",
    });

    expect(copyButton).toBeInTheDocument();
    expect(screen.getByText("Payload")).toBeInTheDocument();
    expect(screen.getByText("Odpowiedź")).toBeInTheDocument();
  });
});
