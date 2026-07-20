import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import { GuildButton } from "@/components/guild-button";
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

  it("preserves rounded timer tiles and guild-selector triggers", () => {
    renderInsideLootlogRoot(
      <>
        <Tile>Timer</Tile>
        <GuildButton
          disabled={false}
          isSelected
          onClick={() => undefined}
          tooltipLabel="Guild"
        >
          G
        </GuildButton>
      </>,
    );

    expect(["4px", "calc(8px - 4px)"]).toContain(
      getComputedStyle(screen.getByText("Timer")).borderRadius,
    );
    const guildButtonStyles = getComputedStyle(screen.getByRole("button"));
    expect(["4px", "calc(8px - 4px)"]).toContain(
      guildButtonStyles.borderRadius,
    );
    expect(guildButtonStyles.boxShadow).toContain("1px");
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
