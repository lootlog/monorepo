import "@/index.css";
import { Tile } from "@/components/ui/tile";
import { Input } from "@/components/ui/input";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnderBagTimers } from "./under-bag-timers";

describe("UnderBagTimers", () => {
  afterEach(() => {
    document.body.className = "";
  });

  it("renders into the bottom wrapper portal and stops wheel propagation", () => {
    document.body.innerHTML = `
      <div id="lootlog-root" class="dark-theme"></div>
      <div class="right-column">
        <div class="inner-wrapper">
          <div class="right-main-column-wrapper">
            <div class="bottom-wrapper"></div>
          </div>
        </div>
      </div>
    `;

    const wheelListener = vi.fn<(event: Event) => void>();
    document
      .querySelector(".right-main-column-wrapper")
      ?.addEventListener("wheel", wheelListener);

    const lootlogRoot = document.getElementById("lootlog-root");

    if (!lootlogRoot) throw new Error("Expected Lootlog root");
    render(
      <UnderBagTimers>
        <Tile>TimersInPortal</Tile>
      </UnderBagTimers>,
      { container: lootlogRoot },
    );

    expect(screen.getByText("TimersInPortal")).toBeVisible();

    const timersContainer = screen.getByText("TimersInPortal").parentElement;

    if (!timersContainer) throw new Error("Expected timers portal container");
    expect(timersContainer).toHaveClass("ll-theme-boundary", "dark-theme");
    expect(["6px", "calc(10px * 0.6)"]).toContain(
      getComputedStyle(screen.getByText("TimersInPortal")).borderRadius,
    );
    fireEvent.wheel(timersContainer);

    expect(wheelListener).not.toHaveBeenCalled();
  });

  it("hides native steppers in compact level inputs rendered under the bag", () => {
    document.body.innerHTML = `
      <div id="lootlog-root" class="dark-theme"></div>
      <div class="right-column">
        <div class="inner-wrapper">
          <div class="right-main-column-wrapper">
            <div class="bottom-wrapper"></div>
          </div>
        </div>
      </div>
    `;

    const lootlogRoot = document.getElementById("lootlog-root");

    if (!lootlogRoot) throw new Error("Expected Lootlog root");
    render(
      <UnderBagTimers>
        <Input
          aria-label="Minimum level"
          className="input-no-spinner ll:w-8"
          type="number"
        />
      </UnderBagTimers>,
      { container: lootlogRoot },
    );

    expect(
      getComputedStyle(
        screen.getByRole("spinbutton", { name: "Minimum level" }),
      ).appearance,
    ).toBe("textfield");
  });
});
