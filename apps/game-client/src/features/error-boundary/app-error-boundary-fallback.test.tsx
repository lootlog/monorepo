import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "react-error-boundary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { AppErrorBoundaryFallback } from "./app-error-boundary-fallback";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_ID,
  APP_ERROR_WINDOW_WIDTH,
} from "./error-boundary.constants";

const mockClipboardWriteText = vi.fn();

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

  it("renders a centered draggable window with error details", () => {
    const error = new Error("Exploded view");
    error.name = "RenderError";
    error.stack = "RenderError: Exploded view\n    at Crash";

    render(
      <AppErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />,
    );

    const windowElement = document.querySelector(
      `[data-ll-draggable-window="${APP_ERROR_WINDOW_ID}"]`,
    );

    expect(screen.getByText("Błąd aplikacji")).toBeInTheDocument();
    expect(screen.getByText("RenderError")).toBeInTheDocument();
    expect(screen.getByText("Exploded view")).toBeInTheDocument();
    expect(screen.getByText(/RenderError: Exploded view/)).toBeInTheDocument();
    expect(windowElement).not.toBeNull();
    expect(windowElement).toHaveStyle({
      left: `${Math.round((1280 - APP_ERROR_WINDOW_WIDTH) / 2)}px`,
      top: `${Math.round((720 - APP_ERROR_WINDOW_DEFAULT_HEIGHT) / 2)}px`,
    });
  });

  it("copies the full error payload to clipboard", async () => {
    mockClipboardWriteText.mockResolvedValue(undefined);
    const error = new Error("Copy this failure");
    error.name = "CopyError";
    error.stack = "CopyError: Copy this failure\n    at Copy";

    render(
      <AppErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kopiuj błąd" }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });

    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      "Typ błędu: CopyError",
    );
    expect(mockClipboardWriteText.mock.calls[0][0]).toContain(
      "Wiadomość: Copy this failure",
    );
    expect(
      screen.getByRole("button", { name: "Skopiowano" }),
    ).toBeInTheDocument();
  });

  it("hides the fallback window when closed", async () => {
    const user = userEvent.setup();
    const error = new Error("Close me");

    render(
      <AppErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Zamknij" }));

    expect(
      screen.queryByRole("button", { name: "Kopiuj błąd" }),
    ).not.toBeInTheDocument();
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
