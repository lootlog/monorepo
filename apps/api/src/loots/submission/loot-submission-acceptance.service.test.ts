import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import type {
  LootSubmissionAcceptancePersistence,
  NewLootPersistence,
} from "./loot-submission-acceptance.repository.js";
import { makeLootSubmissionAcceptance } from "./loot-submission-acceptance.service.js";

type Persistence = LootSubmissionAcceptancePersistence;

type Guild = Effect.Success<
  ReturnType<Persistence["findGuildsForPermissions"]>
>[number];

type CharacterConfig = NonNullable<
  Effect.Success<ReturnType<Persistence["findCharacterConfig"]>>
>;

// SAFETY: acceptance reads only a guild's id and name.
const guild = (id: string) => ({ id, name: `Lootlog ${id}` }) as Guild;

// SAFETY: acceptance reads only the catching Organizations.
const characterConfig = (catchingGuildIds: string[]) =>
  ({ catchingGuildIds }) as CharacterConfig;

const allRarities = ["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"] as const;

type ItemRarity = (typeof allRarities)[number];

const submission: CreateLootRequest = {
  loots: [
    {
      hid: "hid-1",
      name: "Miecz",
      icon: "sword.gif",
      pr: 1,
      prc: "zl",
      stat: "rarity=heroic",
      id: 1,
      cl: 1,
    },
  ],
  npcs: [
    {
      id: 501,
      name: "Boss",
      location: "Ithan",
      lvl: 100,
      prof: "w",
      wt: 20,
      icon: "boss.gif",
      type: 2,
    },
  ],
  players: [
    {
      id: 101,
      accountId: 202,
      name: "Tester",
      lvl: 100,
      prof: "w",
      icon: "hero.gif",
    },
  ],
  world: "luvia",
  gameVersion: "pl",
  source: "FIGHT",
  location: "Ithan",
  accountId: "202",
  characterId: "101",
};

const accept = (options: {
  guilds: Guild[];
  catchingGuildIds: string[] | null;
  configs?: Record<string, readonly ItemRarity[]>;
  memberGuildIds?: string[];
  submission?: CreateLootRequest;
}) => {
  const created: NewLootPersistence[] = [];
  const now = new Date(0);

  const repository: Persistence = {
    findGuildsForPermissions: () => Effect.succeed(options.guilds),
    findCharacterConfig: () =>
      Effect.succeed(
        options.catchingGuildIds === null
          ? null
          : characterConfig(options.catchingGuildIds),
      ),
    findLootlogConfigs: (guildIds) =>
      Effect.succeed(
        guildIds.flatMap((id) => {
          const allowedRarities = options.configs?.[id];

          return allowedRarities
            ? [
                {
                  id,
                  createdAt: now,
                  updatedAt: now,
                  npcs: [
                    {
                      id: 1,
                      lootlogConfigId: id,
                      npcType: "ELITE2" as const,
                      allowedRarities: [...allowedRarities],
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                },
              ]
            : [];
        }),
      ),
    findMembers: (_discordId, guildIds) =>
      Effect.succeed(
        guildIds.flatMap((guildId, index) =>
          (options.memberGuildIds?.includes(guildId) ?? true)
            ? [{ id: index + 1, guildId }]
            : [],
        ),
      ),
    findLootIdByUniqueId: () => Effect.succeed(null),
    hasAmbiguousNpcVariant: () => Effect.die("unused"),
    findExistingRecords: () => Effect.die("unused"),
    appendSubmissions: () => Effect.die("unused"),
    createNewLoot: (data) => {
      created.push(data);

      return Effect.succeed(7);
    },
  };

  const outcome = Effect.runPromise(
    makeLootSubmissionAcceptance(
      repository,
      { withLock: (_resource, _ttl, _options, effect) => effect },
      Effect.void,
    )
      .accept({
        discordId: "discord-1",
        submission: options.submission ?? submission,
      })
      .pipe(
        Effect.match({
          onFailure: (failure) => ({ failure }),
          onSuccess: (response) => ({ response }),
        }),
      ),
  );

  return { created, outcome };
};

const rejection = async (outcome: ReturnType<typeof accept>["outcome"]) => {
  const result = await outcome;

  if (
    !("failure" in result) ||
    !(result.failure instanceof InvalidRequestError)
  )
    throw new Error("Expected the API to reject the loot");

  return result.failure.getResponse();
};

describe("loot submission acceptance", () => {
  // A client that skips submissions may be stale or old; the API must keep
  // rejecting them instead of trusting the client to have filtered them.
  it("rejects a character that catches for no writable Organization", async () => {
    const { created, outcome } = accept({
      guilds: [guild("a"), guild("b")],
      catchingGuildIds: ["gone"],
    });

    expect(await rejection(outcome)).toEqual({
      message: ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
      submittedGuilds: [],
      rejectedGuilds: [
        {
          guildId: "a",
          guildName: "Lootlog a",
          reason: "NOT_ON_CHARACTER_WHITELIST",
        },
        {
          guildId: "b",
          guildName: "Lootlog b",
          reason: "NOT_ON_CHARACTER_WHITELIST",
        },
      ],
    });
    expect(created).toEqual([]);
  });

  it("rejects with every Organization's reason when no configuration accepts the loot", async () => {
    const { created, outcome } = accept({
      guilds: [guild("a"), guild("b"), guild("c"), guild("d")],
      catchingGuildIds: ["b", "c", "d"],
      configs: { b: ["LEGENDARY"], d: allRarities },
      memberGuildIds: ["b", "c"],
    });

    expect(await rejection(outcome)).toMatchObject({
      message: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
      rejectedGuilds: [
        { guildId: "a", reason: "NOT_ON_CHARACTER_WHITELIST" },
        { guildId: "b", reason: "LOOT_NOT_ACCEPTED_BY_CONFIG" },
        { guildId: "c", reason: "MISSING_LOOTLOG_CONFIG" },
        { guildId: "d", reason: "MISSING_MEMBER" },
      ],
    });
    expect(created).toEqual([]);
  });

  // The request schema accepts any stat text; a rarity no config needs must
  // not turn the structured rejection into a server error.
  it("rejects without parsing rarities when no configuration covers the NPC", async () => {
    const { outcome } = accept({
      guilds: [guild("a")],
      catchingGuildIds: ["a"],
      submission: {
        ...submission,
        loots: submission.loots.map((item) => ({
          ...item,
          stat: "rarity=mythic",
        })),
      },
    });

    expect(await rejection(outcome)).toMatchObject({
      message: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
      rejectedGuilds: [{ guildId: "a", reason: "MISSING_LOOTLOG_CONFIG" }],
    });
  });

  it("records the loot only for accepting Organizations and reports the others", async () => {
    const { created, outcome } = accept({
      guilds: [guild("a"), guild("b"), guild("c")],
      catchingGuildIds: ["b", "c"],
      configs: { b: ["LEGENDARY"], c: allRarities },
    });

    expect(await outcome).toMatchObject({
      response: {
        id: 7,
        submittedGuilds: [{ guildId: "c" }],
        rejectedGuilds: [
          { guildId: "a", reason: "NOT_ON_CHARACTER_WHITELIST" },
          { guildId: "b", reason: "LOOT_NOT_ACCEPTED_BY_CONFIG" },
        ],
      },
    });
    expect(created.map(({ submissions }) => submissions)).toMatchObject([
      [{ guildId: "c", memberId: 2 }],
    ]);
    expect(created[0]?.submissions).toHaveLength(1);
  });
});
