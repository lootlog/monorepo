// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Member } from "../../types/api";
import { MemberBadge } from "./member-badge";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    params,
  }: {
    children: ReactNode;
    className?: string;
    params: Record<string, string>;
  }) => (
    <a
      className={className}
      href={`/${params.guildId}/events/${params.eventId}/members/${params.memberId}`}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/utils/get-avatar-url", () => ({
  getDiscordAvatarUrl: () => "https://example.com/avatar.png",
}));

const member: Member = {
  id: 8112,
  name: "KobraK",
  userId: "discord-user",
  avatar: null,
};

afterEach(cleanup);

describe("MemberBadge", () => {
  it("links the complete participant tile to the member event page", () => {
    render(<MemberBadge member={member} guildId="guild-1" eventId="event-1" />);

    const link = screen.getByRole("link", { name: "KobraK" });

    expect(link.getAttribute("href")).toBe(
      "/guild-1/events/event-1/members/8112",
    );
    expect(link.tabIndex).toBe(0);
    expect(link.className).toContain("hover:bg-muted/30");
    expect(link.className).toContain("border-r");
    expect(link.className).toContain("focus-visible:ring-2");
  });
});
