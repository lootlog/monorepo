import { render, screen } from "@testing-library/react";
import { ChatGatheringDetails } from "./chat-gathering-details";

it("renders an NPC's relative icon from the CDN with one name and description", () => {
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
  expect(screen.getAllByText("Dark Hunter")).toHaveLength(1);
  expect(screen.getAllByText("Czekamy przy wejściu")).toHaveLength(1);
});

it("renders old NPC records without an icon without producing a broken image", () => {
  render(<ChatGatheringDetails npc={{ name: "Dark Hunter" }} />);
  expect(screen.getByText("Dark Hunter")).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("preserves the full description once when no NPC is attached", () => {
  const description = "Pierwsza linia\n  Druga linia: <bez zmian>";
  render(<ChatGatheringDetails description={description} />);
  const descriptions = screen.getAllByText(description, {
    normalizer: (text) => text,
  });
  expect(descriptions).toHaveLength(1);
  expect(descriptions[0]?.textContent).toBe(description);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("leaves unnamed gatherings empty and keeps NPC names neutral", () => {
  const { container, rerender } = render(<ChatGatheringDetails />);
  expect(container).toBeEmptyDOMElement();
  rerender(<ChatGatheringDetails npc={{ name: "Hunter", type: "ELITE2" }} />);
  expect(screen.getByText("Hunter").style.color).toBe("");
});

it("shows NPC level and profession above location, including zero coordinates", () => {
  render(
    <ChatGatheringDetails
      npc={{
        name: "Hunter",
        lvl: 180,
        prof: "w",
        location: "Forest",
        x: 0,
        y: 12,
      }}
    />,
  );
  expect(screen.getByText("Hunter").parentElement).toHaveTextContent(
    "Hunter (180w)",
  );
  expect(screen.getByText("Forest (0, 12)")).toBeVisible();
});

it("places the action with description and levels without requiring an NPC", () => {
  render(
    <ChatGatheringDetails
      description="Ekipa"
      minLvl={0}
      maxLvl={200}
      action={<button>Invite</button>}
    />,
  );
  expect(screen.getByText("Ekipa").parentElement).toHaveTextContent("„Ekipa”");
  expect(screen.getByText("Poziom: 0–200")).toBeVisible();
  expect(screen.getByRole("button", { name: "Invite" })).toBeVisible();
});
