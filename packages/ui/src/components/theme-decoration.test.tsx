import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Card } from "./card";
import { ThemeDecoration } from "./theme-decoration";

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
});

describe("theme decorations", () => {
  it.each([
    ["cat-pink", "cat-paw-overlay"],
    ["cat-purple", "cat-paw-overlay"],
    ["cat-blue", "cat-paw-overlay"],
    ["rukia", "rukia-frost-card-overlay"],
    ["rias", "rias-magic-card-overlay"],
  ])(
    "switches mounted cards to %s and back to the default theme",
    async (theme, slot) => {
      const { container } = render(<Card>Content</Card>);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
      await act(() => {
        document.documentElement.className = theme;
        return Promise.resolve();
      });
      expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(
        1,
      );
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
      expect(container.textContent).toBe("Content");
      await act(() => {
        document.documentElement.className = "dark";
        return Promise.resolve();
      });
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    },
  );

  it("shares one root observer across cards and releases it on unmount", () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const { unmount } = render(
      <>
        <Card />
        <Card />
        <Card />
      </>,
    );
    expect(observe).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    observe.mockRestore();
    disconnect.mockRestore();
  });

  it("server renders without accessing document", () => {
    vi.stubGlobal("document", undefined);
    try {
      expect(renderToString(<ThemeDecoration />)).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
