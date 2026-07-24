import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimerAppearancePreview } from "./timer-appearance-preview";

describe("TimerAppearancePreview", () => {
  it("keeps visible spacing between preview timer tiles", () => {
    const { container } = render(<TimerAppearancePreview />);

    const previewGrid = container.querySelector(
      "[style*='grid-template-columns']",
    );
    expect(previewGrid).toHaveClass("ll:content-start", "ll:gap-1.5");
    expect(previewGrid).toHaveStyle({ minHeight: "126px" });
  });
});
