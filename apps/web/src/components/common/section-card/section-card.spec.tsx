// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PageHeader } from "../page-header";
import { SectionCard } from "./section-card";
import { SectionCardHeader } from "./section-card-header";
import { SectionCardContent } from "./section-card-content";
import { SectionCardFooter } from "./section-card-footer";

afterEach(cleanup);

it("keeps page and section headings distinct with usable header actions", () => {
  const onEdit = vi.fn();
  render(
    <>
      <PageHeader title="Event" description="Event description" />
      <SectionCard aria-labelledby="participants-title">
        <SectionCardHeader
          id="participants-title"
          title="Participants"
          actions={<button onClick={onEdit}>Edit participants</button>}
        />
        <SectionCardContent>Participant list</SectionCardContent>
      </SectionCard>
    </>,
  );

  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("heading", { level: 2, name: "Participants" }).id,
  ).toBe("participants-title");
  fireEvent.click(screen.getByRole("button", { name: "Edit participants" }));
  expect(onEdit).toHaveBeenCalledOnce();
});

it("preserves form submission from a section footer", () => {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <SectionCard>
        <SectionCardHeader title="Settings" />
        <SectionCardContent>
          <label>
            Name
            <input name="name" defaultValue="Event" />
          </label>
        </SectionCardContent>
        <SectionCardFooter>
          <button type="submit">Save</button>
        </SectionCardFooter>
      </SectionCard>
    </form>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("textbox", { name: "Name" }).getAttribute("name"),
  ).toBe("name");
});
