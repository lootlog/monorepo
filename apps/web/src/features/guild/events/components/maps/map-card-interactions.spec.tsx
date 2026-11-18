// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemberDirectoryTestWrapper } from "@/lib/testing/member-directory";
import type { EventMap } from "../../types/api";
import { MapCard } from "./map-card";
import { STATUS_STYLES } from "./map-status";

await initializeTestTranslations();

const wrapper = await createMemberDirectoryTestWrapper();

const createMap = (assignedToCurrentMember: boolean): EventMap => ({
  id: "map-1",
  mapId: 2354,
  mapName: "Sala Mroźnych Szeptów",
  locationId: "location-1",
  assignedMembers: assignedToCurrentMember
    ? [
        {
          id: 8112,
          userId: "user-1",
          name: "Wild",
          avatar: null,
        },
      ]
    : [],
});

const renderMapCard = ({
  assignedToCurrentMember = false,
  assignmentDisabled = false,
  onSelfAssignClick = vi.fn(),
  onSelfUnassignClick = vi.fn(),
}: {
  assignedToCurrentMember?: boolean;
  assignmentDisabled?: boolean;
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
} = {}) => {
  const map = createMap(assignedToCurrentMember);

  render(
    <MapCard
      map={map}
      status={assignedToCurrentMember ? "ASSIGNED_ABSENT" : "UNASSIGNED"}
      style={
        STATUS_STYLES[
          assignedToCurrentMember ? "ASSIGNED_ABSENT" : "UNASSIGNED"
        ]
      }
      canManage={false}
      currentMemberId={8112}
      presenceData={new Map()}
      assignmentDisabled={assignmentDisabled}
      onSelfAssignClick={onSelfAssignClick}
      onSelfUnassignClick={onSelfUnassignClick}
      windowStatus="OPEN"
    />,
    { wrapper },
  );

  return { map, onSelfAssignClick, onSelfUnassignClick };
};

describe("MapCard interactions", () => {
  it("keeps the assignment action busy and blocks row activation until completion", async () => {
    let finish = () => {};

    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });

    const onSelfAssignClick = vi.fn(() => pending);
    renderMapCard({ onSelfAssignClick });

    const button = screen.getByRole("button", {
      name: "events.maps.assignSelf",
    });

    fireEvent.click(button);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.doubleClick(screen.getByText("Sala Mroźnych Szeptów"));
    expect(onSelfAssignClick).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await pending;
    });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("assigns the current member by double-clicking the map row", () => {
    const onSelfAssignClick = vi.fn();
    renderMapCard({ onSelfAssignClick });

    fireEvent.doubleClick(screen.getByText("Sala Mroźnych Szeptów"));

    expect(onSelfAssignClick).toHaveBeenCalledOnce();
    expect(onSelfAssignClick).toHaveBeenCalledWith("map-1");
  });

  it("unassigns the current member by double-clicking the map row", () => {
    const onSelfUnassignClick = vi.fn();
    renderMapCard({ assignedToCurrentMember: true, onSelfUnassignClick });

    fireEvent.doubleClick(screen.getByText("Sala Mroźnych Szeptów"));

    expect(onSelfUnassignClick).toHaveBeenCalledOnce();
    expect(onSelfUnassignClick).toHaveBeenCalledWith("map-1");
  });

  it("does not change assignment by double-click when assignments are disabled", () => {
    const onSelfAssignClick = vi.fn();
    renderMapCard({ assignmentDisabled: true, onSelfAssignClick });

    fireEvent.doubleClick(screen.getByText("Sala Mroźnych Szeptów"));

    expect(onSelfAssignClick).not.toHaveBeenCalled();
  });

  it("does not trigger the row action by double-clicking an action icon", () => {
    const onSelfAssignClick = vi.fn();
    renderMapCard({ onSelfAssignClick });

    fireEvent.doubleClick(
      screen.getByRole("button", { name: "events.maps.assignSelf" }),
    );

    expect(onSelfAssignClick).not.toHaveBeenCalled();
  });

  it("updates the timer while retaining the assigned member row", () => {
    vi.useFakeTimers();
    renderMapCard({ assignedToCurrentMember: true });
    const member = screen.getByText("Wild");

    act(() => vi.advanceTimersByTime(2_000));

    expect(screen.getByText("Wild")).toBe(member);
    expect(screen.getByText("00:00:02")).toBeTruthy();
  });
});
