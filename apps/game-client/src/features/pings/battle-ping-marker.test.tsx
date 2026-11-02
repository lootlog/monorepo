import { render } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { BattlePingMarker } from "./battle-ping-marker";

/** jsdom has no Web Animations; the countdown is the only caller here. */
const animate = vi.fn<() => { cancel: () => void }>(() => ({
  cancel: vi.fn<() => void>(),
}));

const preferReducedMotion = (reduce: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
  }));
};

const renderMark = () =>
  render(
    <BattlePingMarker
      highlighted={false}
      mark={{
        entryId: 1,
        expiresAt: performance.now() + 3_000,
        forMe: false,
        senderName: "Borsuk",
        type: "caution",
      }}
      target={undefined}
    />,
  );

beforeEach(() => {
  animate.mockClear();
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  useSettingsStore.setState({ animationEffectsEnabled: true });
});

afterEach(() => {
  preferReducedMotion(false);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
});

afterAll(() => {
  Reflect.deleteProperty(Element.prototype, "animate");
});

it("drains a mark's countdown while Lootlog may animate", () => {
  preferReducedMotion(false);
  renderMark();

  expect(animate).toHaveBeenCalled();
});

it("keeps a mark's countdown still when the system asks for reduced motion", () => {
  preferReducedMotion(true);
  renderMark();

  expect(animate).not.toHaveBeenCalled();
});
