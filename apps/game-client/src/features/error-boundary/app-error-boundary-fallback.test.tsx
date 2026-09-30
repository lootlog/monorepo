import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "react-error-boundary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { AppErrorBoundaryFallback } from "./app-error-boundary-fallback";
import { APP_ERROR_WINDOW_ID } from "./error-boundary.constants";

const mockClipboardWriteText = vi.fn<Clipboard["writeText"]>();

function ThrowError(): never {
  throw new Error("Boom failure");
}

describe("AppErrorBoundaryFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "pl-PL",
    });
    Object.defineProperty(globalThis.navigator, "language", {
      configurable: true,
      value: "pl-PL",
    });

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

    useWindowsStore.setState((state) => ({
      ...state,
      [APP_ERROR_WINDOW_ID]: {
        ...state[APP_ERROR_WINDOW_ID],
        open: false,
        position: { x: 0, y: 0 },
      },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("renders a draggable window with error details", () => {
    const error = new Error("Exploded view");
    error.name = "RenderError";
    error.stack = "RenderError: Exploded view\n    at Crash";

    render(
      <AppErrorBoundaryFallback
        error={error}
        resetErrorBoundary={vi.fn<() => void>()}
      />,
    );

    const windowElement = document.querySelector(
      `[data-ll-draggable-window="${APP_ERROR_WINDOW_ID}"]`,
    );

    expect(screen.getByText("Błąd Lootloga")).toBeInTheDocument();
    expect(screen.getByText("RenderError")).toBeInTheDocument();
    expect(screen.getByText("Exploded view")).toBeInTheDocument();
    expect(screen.getByText(/RenderError: Exploded view/)).toBeInTheDocument();
    expect(windowElement).not.toBeNull();
  });

  it("copies the diagnostics together with the full error payload", async () => {
    mockClipboardWriteText.mockResolvedValue(undefined);
    const error = new Error("Copy this failure");
    error.name = "CopyError";
    error.stack = "CopyError: Copy this failure\n    at Copy";

    render(
      <AppErrorBoundaryFallback
        error={error}
        resetErrorBoundary={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Kopiuj informacje diagnostyczne" }),
    );

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });

    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      "Typ błędu: CopyError",
    );
    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      "Treść błędu: Copy this failure",
    );
    expect(mockClipboardWriteText.mock.calls[0][0]).toContain("game bridge:");
    expect(
      screen.getByRole("button", {
        name: "Skopiowano informacje diagnostyczne",
      }),
    ).toBeInTheDocument();
  });

  it("offers a way back to the error window after it is closed", async () => {
    const user = userEvent.setup();

    render(
      <AppErrorBoundaryFallback
        error={new Error("Close me")}
        resetErrorBoundary={vi.fn<() => void>()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Zamknij okno" }));
    await waitFor(() =>
      expect(screen.queryByText("Close me")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Błąd Lootloga" }));
    expect(await screen.findByText("Close me")).toBeInTheDocument();
  });

  it("remounts the interface when the player reloads the addon", async () => {
    const user = userEvent.setup();

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    let shouldThrow = true;

    const Flaky = () => {
      if (shouldThrow) throw new Error("Transient failure");

      return <p>Interface restored</p>;
    };

    render(
      <ErrorBoundary FallbackComponent={AppErrorBoundaryFallback}>
        <Flaky />
      </ErrorBoundary>,
    );

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Przeładuj dodatek" }));

    expect(await screen.findByText("Interface restored")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("renders from ErrorBoundary when a child throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ErrorBoundary FallbackComponent={AppErrorBoundaryFallback}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Boom failure")).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
