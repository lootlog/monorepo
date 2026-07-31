// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
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
}) =>
  render(
    <EventActionsCard
      canManage={canManage}
      canDeleteEvent={canDeleteEvent}
      isActive
      isUpdatePending={false}
      isDeletePending={false}
      onEdit={vi.fn()}
      onToggleStatus={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

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
    renderEventActionsCard({
      canManage: true,
      canDeleteEvent: false,
    });

    expect(screen.getByText("events.actionsCard.subtitle")).toBeTruthy();
  });
});
