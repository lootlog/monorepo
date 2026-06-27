import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatedWindow } from "./animated-window";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    div: ({ children }: { children: ReactNode }) => (
      <div data-testid="motion-window">{children}</div>
    ),
  },
}));

describe("AnimatedWindow", () => {
  afterEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
  });

  it("renders with framer motion when animation effects are enabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });

    render(
      <AnimatedWindow isOpen windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    expect(screen.getByTestId("motion-window")).toBeInTheDocument();
  });

  it("renders without framer motion when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(
      <AnimatedWindow isOpen windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    expect(screen.queryByTestId("motion-window")).not.toBeInTheDocument();
    expect(screen.queryByTestId("animate-presence")).not.toBeInTheDocument();
    expect(screen.getByText("Window content")).toBeInTheDocument();
  });
});
