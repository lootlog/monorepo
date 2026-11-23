import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PageHeader } from "./page-header";
import { SectionCard } from "./section-card";
import { SectionCardHeader } from "./section-card-header";
import { SectionCardContent } from "./section-card-content";

afterEach(cleanup);

it("keeps page and section headings distinct", () => {
  render(
    <>
      <PageHeader title="Event" description="Event description" />
      <SectionCard aria-labelledby="participants-title">
        <SectionCardHeader id="participants-title" title="Participants" />
        <SectionCardContent>Participant list</SectionCardContent>
      </SectionCard>
    </>,
  );

  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("heading", { level: 2, name: "Participants" }).id,
  ).toBe("participants-title");
});
