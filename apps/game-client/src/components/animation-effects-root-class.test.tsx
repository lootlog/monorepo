import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { AnimationEffectsRootClass } from "./animation-effects-root-class";

describe("AnimationEffectsRootClass", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.id = "lootlog-root";
    document.body.append(root);
    useSettingsStore.setState({ animationEffectsEnabled: true });
  });

  afterEach(() => {
    root.remove();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("toggles the reduced motion class from animation settings", () => {
    const { unmount } = render(<AnimationEffectsRootClass />);

    expect(root).not.toHaveClass("ll-reduced-motion");

    act(() => {
      useSettingsStore.getState().toggleAnimationEffects();
    });

    expect(root).toHaveClass("ll-reduced-motion");

    act(() => {
      useSettingsStore.getState().toggleAnimationEffects();
    });

    expect(root).not.toHaveClass("ll-reduced-motion");

    act(() => {
      useSettingsStore.getState().toggleAnimationEffects();
    });

    unmount();

    expect(root).not.toHaveClass("ll-reduced-motion");
  });
});
