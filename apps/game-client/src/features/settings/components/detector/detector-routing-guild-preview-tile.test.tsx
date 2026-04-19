import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Guild } from "@/hooks/api/use-guilds";
import { DetectorRoutingGuildPreviewTile } from "./detector-routing-guild-preview-tile";

describe("DetectorRoutingGuildPreviewTile", () => {
  it("exposes the guild name through the trigger label and tooltip", async () => {
    const user = userEvent.setup();
    const guild: Guild = {
      id: "guild-1",
      name: "Alpha",
      icon: "https://cdn.example.com/alpha.png",
    };

    render(<DetectorRoutingGuildPreviewTile guild={guild} />);

    const trigger = screen.getByLabelText("Alpha");

    expect(trigger).toBeInTheDocument();

    await user.hover(trigger);

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Alpha");
  });

  it("falls back to the first guild letter when no icon is available", () => {
    const guild: Guild = {
      id: "guild-1",
      name: "Beta",
      icon: null,
    };

    render(<DetectorRoutingGuildPreviewTile guild={guild} />);

    expect(screen.getByLabelText("Beta")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
