import { render, screen } from "@testing-library/react";
import { ChatGatheringDetails } from "./chat-gathering-details";

it("resolves a relative NPC icon against the CDN", () => {
  render(
    <ChatGatheringDetails
      npc={{ name: "Dark Hunter", icon: "hunter.gif" }}
      description="Czekamy przy wejściu"
    />,
  );
  expect(screen.getByRole("img", { name: "Dark Hunter" })).toHaveAttribute(
    "src",
    "https://micc.garmory-cdn.cloud/obrazki/npc/hunter.gif",
  );
});

it("renders old NPC records without an icon without producing a broken image", () => {
  render(<ChatGatheringDetails npc={{ name: "Dark Hunter" }} />);
  expect(screen.getByText("Dark Hunter")).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
