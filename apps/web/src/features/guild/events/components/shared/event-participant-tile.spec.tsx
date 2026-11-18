// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemberDirectoryTestWrapper } from "@/lib/testing/member-directory";
import type { Member } from "../../types/api";
import { EventParticipantTile } from "./event-participant-tile";

const member: Member = {
  id: 8112,
  name: "KobraK",
  userId: "discord-user",
  avatar: null,
};

afterEach(cleanup);

describe("EventParticipantTile", () => {
  it("links the complete participant tile to the member event page", async () => {
    render(
      <EventParticipantTile
        member={member}
        guildId="guild-1"
        eventId="event-1"
      />,
      { wrapper: await createMemberDirectoryTestWrapper() },
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/guild-1/events/event-1/members/8112",
    );
    expect(screen.getByText("KobraK")).toBeTruthy();
  });
});
