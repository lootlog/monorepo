import type { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import App from "./App";

const runtimeMocks = vi.hoisted(() => ({
  captureReactError: vi.fn(),
  disposeSoundPlayback: vi.fn(),
  renderError: new Error("App render failed"),
}));

vi.mock("@/lib/error-monitoring", () => ({
  captureReactError: runtimeMocks.captureReactError,
}));

vi.mock("@/lib/sound-playback", () => ({
  disposeSoundPlayback: runtimeMocks.disposeSoundPlayback,
}));

vi.mock("@/app-content", () => ({
  AppContent: () => {
    throw runtimeMocks.renderError;
  },
}));

vi.mock("@/features/error-boundary/app-error-boundary-fallback", () => ({
  AppErrorBoundaryFallback: () => null,
}));

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: PropsWithChildren) => children,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: PropsWithChildren) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: PropsWithChildren) => children,
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: {},
}));

vi.mock("@/contexts/socket-context", () => ({
  SocketProvider: ({ children }: PropsWithChildren) => children,
}));

vi.mock("@/perf-fixture/browser-perf-fixture-bridge", () => ({
  BrowserPerfFixtureBridge: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

it("reports errors caught by the application error boundary", () => {
  render(<App />);

  expect(runtimeMocks.disposeSoundPlayback).toHaveBeenCalledTimes(1);
  expect(runtimeMocks.captureReactError).toHaveBeenCalledWith(
    runtimeMocks.renderError,
    expect.objectContaining({ componentStack: expect.any(String) }),
  );
});
