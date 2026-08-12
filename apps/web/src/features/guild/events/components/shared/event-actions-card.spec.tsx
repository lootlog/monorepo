// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventActionsCard } from "./event-actions-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const renderEventActionsCard = ({
  canManage,
  canDeleteEvent,
}: {
  canManage: boolean;
  canDeleteEvent: boolean;
}) => {
  const onDelete = vi.fn();
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  const view = render(
    <EventActionsCard
      canManage={canManage}
      canDeleteEvent={canDeleteEvent}
      isActive
      isUpdatePending={false}
      isDeletePending={false}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onDelete={onDelete}
    />,
  );

  return { ...view, onDelete, onEdit, onToggleStatus };
};

describe("EventActionsCard", () => {
  afterEach(cleanup);

  it("does not render for a user who cannot manage the event", () => {
    renderEventActionsCard({
      canManage: false,
      canDeleteEvent: true,
    });

    expect(screen.queryByText("events.actionsCard.subtitle")).toBeNull();
  });

  it("renders for a user who can manage the event", () => {
    const { onDelete, onEdit, onToggleStatus } = renderEventActionsCard({
      canManage: true,
      canDeleteEvent: true,
    });

    const heading = screen.getByRole("heading", {
      name: "events.actionsCard.subtitle",
    });
    expect(heading.closest("header")?.getAttribute("class")).toContain(
      "min-h-12",
    );

    fireEvent.click(screen.getByRole("button", { name: "events.editButton" }));
    fireEvent.click(screen.getByRole("button", { name: "events.end" }));
    fireEvent.click(screen.getByRole("button", { name: "events.delete" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onToggleStatus).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
