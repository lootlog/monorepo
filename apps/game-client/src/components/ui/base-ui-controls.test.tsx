import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
  it("names a single thumb and renders one thumb per range value", () => {
    const { rerender } = render(<Slider aria-label="Volume" value={25} />);

    expect(screen.getByRole("slider", { name: "Volume" })).toHaveValue("25");

    rerender(<Slider aria-label="Range" value={[10, 40]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
});
