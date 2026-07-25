import "@/index.css";
import { afterEach, describe, expect, it } from "vitest";

const getRequiredElement = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing test element: ${selector}`);
  }

  return element;
};

describe("host layout styles", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("sizes game columns without overriding the Margonem loader", () => {
    document.body.innerHTML = `
      <div class="game-window-positioner">
        <div class="interface-layer layer">
          <div class="right-column main-column">
            <div class="inner-wrapper" data-testid="game-column"></div>
          </div>
        </div>
        <div class="loader-layer layer">
          <div class="progress-bar">
            <div class="progress-bar-and-image-wrapper">
              <div class="inner-wrapper" data-testid="loader-progress"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="lootlog-root"></div>
    `;

    const gameColumn = getRequiredElement('[data-testid="game-column"]');
    const loaderProgress = getRequiredElement(
      '[data-testid="loader-progress"]',
    );

    expect(getComputedStyle(gameColumn).height).toBe("100%");
    expect(getComputedStyle(loaderProgress).height).not.toBe("100%");
  });
});
