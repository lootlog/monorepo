import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tile } from "@/components/ui/tile";
import { TooltipProvider } from "@/components/ui/tooltip";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./input";

const renderInsideLootlogRoot = (element: React.ReactElement) => {
  const lootlogRoot = document.createElement("div");
  lootlogRoot.id = "lootlog-root";
  lootlogRoot.className = "dark-theme";
  document.body.append(lootlogRoot);

  return render(<TooltipProvider>{element}</TooltipProvider>, {
    container: lootlogRoot,
  });
};

describe("scoped theme styles", () => {
  afterEach(() => {
    document.getElementById("lootlog-root")?.remove();
  });

  it("preserves rounded timer tiles", () => {
    renderInsideLootlogRoot(<Tile>Timer</Tile>);

    expect(["6px", "calc(10px * 0.6)"]).toContain(
      getComputedStyle(screen.getByText("Timer")).borderRadius,
    );
  });

  it("preserves the purple focus ring on inputs", () => {
    renderInsideLootlogRoot(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });

    fireEvent.focus(input);

    expect(input).toHaveClass(
      "ll:focus-visible:ring-ring/50",
      "ll:focus-visible:ring-[3px]",
    );
  });
});
