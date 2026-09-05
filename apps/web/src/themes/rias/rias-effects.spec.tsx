// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GremoryCircle } from "./rias-effects";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GremoryCircle motion preferences", () => {
  it("stops a running decorative rotation without remounting interactive content", async () => {
    let matches = false;
    const events = new EventTarget();
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return matches;
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      addListener: () => {},
      removeListener: () => {},
    }));
    const { container, getByRole } = render(
      <GremoryCircle isActive>
        <input aria-label="Name" />
      </GremoryCircle>,
    );
    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "Unchanged" } });
    const animatedDecoration = container.querySelector("svg")?.parentElement;
    act(() => {
      matches = true;
      events.dispatchEvent(new Event("change"));
    });
    const staticDecoration = container.querySelector("svg")?.parentElement;
    expect(staticDecoration).not.toBe(animatedDecoration);
    expect(getByRole("textbox")).toBe(input);
    expect(input.getAttribute("aria-label")).toBe("Name");
    await waitFor(() =>
      expect(staticDecoration?.style.transform).toBe("rotate(360deg)"),
    );
  });
});
