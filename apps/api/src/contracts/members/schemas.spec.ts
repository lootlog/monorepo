import { expect, test } from "bun:test";
import * as Schema from "effect/Schema";
import { MemberResponse, NullableMemberResponse } from "./schemas.js";

test("member responses preserve nullable lookup and its extensible JSON fields", () => {
  const member = {
    id: 1,
    userId: "user",
    guildId: "organization",
    type: "USER",
    name: "Player",
    active: true,
    roles: [],
    updatedAt: "2026-09-04T12:00:00Z",
    extra: { nested: [null, true, "value"] },
  } as const;
  const decode = Schema.decodeUnknownSync(NullableMemberResponse);
  expect(decode(null)).toBeNull();
  expect(decode(member)).toEqual(member);
  const { extra: _extra, ...knownFields } = member;
  expect(Schema.decodeUnknownSync(MemberResponse)(member)).toEqual(knownFields);
  expect(() =>
    decode({ ...member, updatedAt: "2026-02-29T12:00:00Z" }),
  ).toThrow();
  expect(() =>
    decode({
      ...member,
      roles: [
        {
          id: "r",
          guildId: "organization",
          name: "Role",
          color: null,
          permissions: ["UNKNOWN"],
        },
      ],
    }),
  ).toThrow();
});
