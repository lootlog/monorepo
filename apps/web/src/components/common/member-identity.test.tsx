// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createMemberDirectoryTestWrapper } from "@/lib/testing/member-directory";
import type { MemberReferenceResponseDtoOutput } from "@lootlog/client/main";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, expect, it } from "vitest";
import { MemberIdentity } from "./member-identity";

await initializeTestTranslations();

const member: MemberReferenceResponseDtoOutput = {
  id: 7,
  userId: "discord-7",
  globalUserId: "user-7",
  name: "Szef",
  displayName: "Borys",
  username: "borys.krwawy",
  avatar: null,
  globalAvatar: null,
  bannerUrl: null,
  color: null,
  roles: [{ id: "role-1", name: "Lider", color: 0xe74c3c }],
  joinedAt: null,
  active: true,
};

const wrapper = await createMemberDirectoryTestWrapper([member]);

const renderIdentity = (element: ReactElement) => render(element, { wrapper });

afterEach(cleanup);

it("names the member by the Organization's current nickname and opens who they are on Discord", async () => {
  renderIdentity(
    <MemberIdentity
      member={{ userId: "user-7" }}
      fallback={{ name: "Stary nick" }}
    />,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Szef" }));

  const profile = await screen.findByRole("dialog");

  expect(profile.textContent).toContain("Borys");
  expect(profile.textContent).toContain("@borys.krwawy");
  expect(profile.textContent).toContain("Lider");
  expect(
    profile.querySelector('a[href="https://discord.com/users/discord-7"]'),
  ).not.toBeNull();
});

it("keeps the record's own name, without a profile, for someone the Organization does not list", async () => {
  renderIdentity(
    <MemberIdentity
      member={{ discordId: "discord-unknown" }}
      fallback={{ name: "Dawny członek" }}
    />,
  );

  expect(await screen.findByText("Dawny członek")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
