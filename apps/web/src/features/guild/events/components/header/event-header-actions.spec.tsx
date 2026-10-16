// @vitest-environment happy-dom

import { createEventOverview } from "@/lib/testing/event";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventHeaderActions } from "./event-header-actions";

const i18n = await initializeTestTranslations();

const renderActions = ({
  canManage,
  canDeleteEvent,
}: {
  canManage: boolean;
  canDeleteEvent: boolean;
}) => {
  const handlers = {
    navigateToEventEdit: vi.fn(),
    openEventStatusDialog: vi.fn(),
    setDeleteDialogOpen: vi.fn(),
  };

  render(
    <EventHeaderActions
      t={i18n.t}
      event={createEventOverview()}
      eventId="event-1"
      setRulesDialogOpen={vi.fn()}
      setSummaryDialogOpen={vi.fn()}
      isPinPending={() => false}
      eventIsPinned={false}
      pinActionLabel="events.pinEvent"
      isEventActive
      togglePin={vi.fn()}
      canManage={canManage}
      canDeleteEvent={canDeleteEvent}
      isUpdatePending={false}
      isDeletePending={false}
      {...handlers}
    />,
  );

  return handlers;
};

describe("EventHeaderActions", () => {
  afterEach(cleanup);

  it("hides event management from a member who cannot manage the event", () => {
    renderActions({ canManage: false, canDeleteEvent: true });

    expect(
      screen.queryByRole("button", { name: "events.header.manage" }),
    ).toBeNull();
  });

  it("lets a manager edit and end the event, and only an admin delete it", async () => {
    const handlers = renderActions({ canManage: true, canDeleteEvent: false });

    const openMenu = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "events.header.manage" }),
      );

    openMenu();

    const edit = await screen.findByRole("menuitem", {
      name: "events.editButton",
    });

    expect(
      screen.queryByRole("menuitem", { name: "events.delete" }),
    ).toBeNull();

    fireEvent.click(edit);
    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "events.end" }),
    );

    expect(handlers.navigateToEventEdit).toHaveBeenCalledOnce();
    expect(handlers.openEventStatusDialog).toHaveBeenCalledOnce();
  });
});
