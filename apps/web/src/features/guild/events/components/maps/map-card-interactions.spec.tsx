// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventMap } from "../../types/api";
import { MapCard, STATUS_STYLES } from "./map-card";

const { getDiscordAvatarUrlSpy } = vi.hoisted(() => ({
  getDiscordAvatarUrlSpy: vi.fn(() => "https://example.com/avatar.png"),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/tiles", () => ({
  PlayerTile: () => null,
}));

vi.mock("@/utils/get-avatar-url", () => ({
  getDiscordAvatarUrl: getDiscordAvatarUrlSpy,
}));

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
  );

  return { map, onSelfAssignClick, onSelfUnassignClick };
};

describe("MapCard interactions", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    getDiscordAvatarUrlSpy.mockClear();
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

  it("keeps assignments below the map identity at every breakpoint", () => {
    renderMapCard({ assignedToCurrentMember: true });

    const assignmentRow = screen.getByText("Wild").parentElement;

    expect(assignmentRow?.className).toContain("row-start-2");
    expect(assignmentRow?.className).not.toContain("lg:row-start-1");
  });

  it("renders the timer in the same row as the map identity", () => {
    renderMapCard();

    const identityRow = screen.getByText("Sala Mroźnych Szeptów").parentElement
      ?.parentElement;

    expect(identityRow?.textContent).toContain("#2354");
    expect(identityRow?.textContent).toContain("00:00:00");
  });

  it("updates the timer without rerendering the complete map row", () => {
    vi.useFakeTimers();
    renderMapCard({ assignedToCurrentMember: true });
    const avatarRenderCount = getDiscordAvatarUrlSpy.mock.calls.length;

    act(() => vi.advanceTimersByTime(2_000));

    expect(getDiscordAvatarUrlSpy).toHaveBeenCalledTimes(avatarRenderCount);
  });
});
