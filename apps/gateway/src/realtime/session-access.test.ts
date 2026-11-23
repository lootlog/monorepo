import { expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { membership } from "../../test/realtime-fixtures.js";
import { sessionAccessPolicy } from "./session-access.js";

test.each([
  [undefined, []],
  [
    true,
    [
      Permission.LOOTLOG_HERO_SIGHTINGS_READ,
      Permission.LOOTLOG_HERO_SIGHTINGS_WRITE,
    ],
  ],
])(
  "a session declaring hero sighting capabilities %p receives %p",
  (heroSightingCapabilities, expected) => {
    const [organization] = sessionAccessPolicy({
      discordId: "member",
      heroSightingCapabilities,
      guilds: [
        membership("organization-1", [
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_HERO_SIGHTINGS_READ,
          Permission.LOOTLOG_HERO_SIGHTINGS_WRITE,
        ]),
      ],
    }).organizations;

    expect(
      organization?.permissions.filter((permission) =>
        permission.startsWith("LOOTLOG_HERO_SIGHTINGS_"),
      ),
    ).toEqual(expected);
    expect(organization?.permissions).toContain(Permission.LOOTLOG_TIMERS_READ);
  },
);
