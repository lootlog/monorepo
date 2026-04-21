import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnderBagTimers } from "./under-bag-timers";

describe("UnderBagTimers", () => {
  it("renders into the bottom wrapper portal and stops wheel propagation", () => {
    document.body.innerHTML = `
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

    render(
      <UnderBagTimers>
        <span>TimersInPortal</span>
      </UnderBagTimers>,
    );

    expect(screen.getByText("TimersInPortal")).toBeVisible();

    fireEvent.wheel(screen.getByText("TimersInPortal").parentElement!);

    expect(wheelListener).not.toHaveBeenCalled();
  });
});
