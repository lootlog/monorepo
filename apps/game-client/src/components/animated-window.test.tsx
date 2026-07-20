import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatedWindow } from "./animated-window";

describe("AnimatedWindow", () => {
  afterEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
  });

  it("uses a CSS-only entry animation when animation effects are enabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });

    render(
      <AnimatedWindow isOpen windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    expect(screen.getByText("Window content").parentElement).toHaveClass(
      "ll:animate-in",
      "ll:fade-in-0",
      "ll:zoom-in-95",
    );
  });

  it("renders without an animation class when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(
      <AnimatedWindow isOpen windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    expect(screen.getByText("Window content").parentElement).not.toHaveClass(
      "ll:animate-in",
    );
  });

  it("keeps the window mounted through its CSS exit animation", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });

    const { rerender } = render(
      <AnimatedWindow isOpen windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    rerender(
      <AnimatedWindow isOpen={false} windowKey="settings">
        <span>Window content</span>
      </AnimatedWindow>,
    );

    const windowElement = screen.getByText("Window content").parentElement;
    expect(windowElement).toHaveClass(
      "ll:animate-out",
      "ll:fade-out-0",
      "ll:zoom-out-95",
    );

    fireEvent.animationEnd(windowElement as HTMLElement);

    expect(screen.queryByText("Window content")).not.toBeInTheDocument();
  });
});
