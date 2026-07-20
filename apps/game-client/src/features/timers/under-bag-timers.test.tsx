import "@/index.css";
import { Tile } from "@/components/ui/tile";
import { Input } from "@/components/ui/input";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnderBagTimers } from "./under-bag-timers";

describe("UnderBagTimers", () => {
  afterEach(() => {
    document.body.className = "";
    document.querySelector("style[data-host-cursor]")?.remove();
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

    const wheelListener = vi.fn();
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
    expect(["4px", "calc(8px - 4px)"]).toContain(
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

  it("preserves SI selection and nested pointer styles in the host portal", () => {
    document.body.className = "si";
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
    const hostCursorStyle = document.createElement("style");
    hostCursorStyle.dataset.hostCursor = "true";
    hostCursorStyle.textContent = "body.si path { cursor: default; }";
    document.head.append(hostCursorStyle);

    const lootlogRoot = document.getElementById("lootlog-root");
    if (!lootlogRoot) throw new Error("Expected Lootlog root");
    render(
      <UnderBagTimers>
        <span data-testid="timer-label">Timer label</span>
        <svg className="ll-custom-cursor-pointer" aria-label="Timer action">
          <path data-testid="timer-action-path" />
        </svg>
      </UnderBagTimers>,
      { container: lootlogRoot },
    );

    expect(getComputedStyle(screen.getByTestId("timer-label")).userSelect).toBe(
      "none",
    );
    expect(getComputedStyle(screen.getByLabelText("Timer action")).cursor).toBe(
      "pointer",
    );
    expect(
      getComputedStyle(screen.getByTestId("timer-action-path")).cursor,
    ).toBe("inherit");
  });
});
