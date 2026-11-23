import { expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import { PARTY_OBSERVATION_HEARTBEAT_MS } from "@lootlog/schema/party-ready-room";
import { Capability } from "@lootlog/schema/permissions";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { createReadyRoomActiveHarness } from "./ready-room-active.fixtures.js";

it("keeps authorized gathering rosters current across discovery, observations, applications and cancellation", async () => {
  const {
    state,
    databaseBoundary,
    base,
    rooms,
    olderCommitStarted,
    releaseOlderCommit,
    gatheringEvents,
    cancellationEvents,
    stateEvents,
    boundary,
    querySpy,
    get,
    send,
  } = await createReadyRoomActiveHarness();

  try {
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "visible", ownerId: "different-owner" }),
          createGuildFixture({ id: "hidden", ownerId: "other" }),
        ]),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "visible",
          userId: "owner",
          globalUserId: "user",
        }),
      ),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(roleTable).values({
        id: "sender",
        guildId: "visible",
        name: "Sender",
        updatedAt: new Date(),
        permissions: [Capability.LOOTLOG_NOTIFICATIONS_SEND],
        lvlRangeFrom: 200,
        lvlRangeTo: 500,
      }),
    );
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(memberToRoleTable)
        .values({ A: 1, B: "sender" }),
    );

    state.emptyIndex = true;

    for (const [path, queries] of [
      ["/messaging/party-gathering/active?world=experimental", 1],
      ["/messaging/party-gathering", 0],
    ] as const) {
      querySpy.mockClear();

      const empty = await get(path);

      expect(empty.status).toBe(200);
      expect(await empty.json()).toEqual([]);
      expect(querySpy).toHaveBeenCalledTimes(queries);
    }

    state.emptyIndex = false;
    querySpy.mockClear();

    const response = await get(
      "/messaging/party-gathering/active?world=experimental",
    );

    expect(response.status).toBe(200);

    expect(querySpy).toHaveBeenCalledTimes(2);

    const summary = {
      notificationId: "minimal",
      organizerName: "Author",
      organizerDiscordId: "owner",
      organizerLvl: 100,
      organizerProf: "w",
      revision: 1,
      volunteers: [],
      partyState: { status: "UNKNOWN" },
      applicantCount: 0,
      inPartyCount: 0,
      guildIds: ["visible"],
      world: "experimental",
      createdAt: base.createdAt,
      expiresAt: base.expiresAt,
    };

    expect(await response.json()).toEqual([
      summary,
      {
        ...summary,
        notificationId: "npc",
        applicantCount: 2,
        volunteers: ["3", "5"].map((characterId) => ({
          characterId,
          nick: "Author",
          icon: "icon",
          lvl: 100,
          prof: "w",
          partyPresence: "OUTSIDE",
        })),
        description: "",
        minLvl: 1,
        maxLvl: 500,
        npc: { name: "NPC", location: "Map", lvl: 100, type: "HERO" },
      },
      {
        ...summary,
        notificationId: "coordinates",
        npc: {
          name: "NPC",
          location: "Map",
          lvl: 100,
          type: "HERO",
          icon: "npc.gif",
          prof: "w",
          x: 0,
          y: 12,
        },
      },
      {
        ...summary,
        notificationId: "own-filtered",
        npc: { name: "Training NPC", location: "Map", lvl: 0, type: "TITAN" },
      },
    ]);

    state.caller = {
      ...state.caller,
      apiKey: {
        keyId: "visible-only",
        organizationIds: ["visible"],
        mode: "read",
        personalData: false,
        expiresAt: null,
      },
    };
    querySpy.mockClear();

    const scopedList = await get("/messaging/party-gathering");

    expect(scopedList.status).toBe(200);
    expect(await scopedList.json()).toEqual([]);
    expect(querySpy).toHaveBeenCalledTimes(2);
    state.caller = { userId: "user", discordId: "owner" };

    const emptyObservation = await send(
      "POST",
      "/messaging/party-gathering/minimal/party-observation",
      {
        organizerAccountId: "1",
        organizerCharacterId: "2",
        memberCharacterIds: [],
      },
    );

    expect(emptyObservation.status).toBe(201);
    expect(await emptyObservation.json()).toEqual(
      expect.objectContaining({ partyMemberCount: 0, revision: 2 }),
    );

    const observation = await send(
      "POST",
      "/messaging/party-gathering/npc/party-observation",
      {
        organizerAccountId: "1",
        organizerCharacterId: "2",
        memberCharacterIds: ["2", "3", "unregistered-party-member", "3"],
        members: [
          {
            characterId: "unregistered-party-member",
            nick: "Guest",
            icon: "guest.gif",
            prof: "m",
            accountId: "private-account",
          },
          { characterId: "not-in-party", nick: "Not observed" },
        ],
      },
    );

    expect(observation.status).toBe(201);
    expect(await observation.json()).toMatchObject({
      partyMemberCount: 3,
      revision: 2,
      partyState: {
        status: "OBSERVED",
        observedAt: base.updatedAt,
        members: [
          { characterId: "2", nick: "Author" },
          { characterId: "3", nick: "Author" },
          {
            characterId: "unregistered-party-member",
            nick: "Guest",
            icon: "guest.gif",
            prof: "m",
          },
        ],
      },
    });

    for (const [members, total, revision] of [
      [["2", "3", "outsider-a", "outsider-b"], 4, 3],
      [["outsider-b", "3", "2", "outsider-a", "2"], 4, 3],
      [["2", "5", "outsider-a", "outsider-b"], 4, 4],
      [["2", "3", "outsider-a", "outsider-b"], 4, 5],
      [["2", "3", "outsider-a", "outsider-c"], 4, 6],
    ] as const) {
      const response = await send(
        "POST",
        "/messaging/party-gathering/npc/party-observation",
        {
          organizerAccountId: "1",
          organizerCharacterId: "2",
          memberCharacterIds: members,
        },
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(
        expect.objectContaining({ partyMemberCount: total, revision }),
      );
    }

    const latestObservation = stateEvents.at(-1);
    expect(latestObservation).toMatchObject({
      notificationId: "npc",
      revision: 6,
      update: {
        type: "UPSERT",
        gathering: {
          revision: 6,
          volunteers: [
            { characterId: "3", partyPresence: "IN_PARTY" },
            { characterId: "5", partyPresence: "OUTSIDE" },
          ],
          partyState: {
            status: "OBSERVED",
            members: [
              { characterId: "2" },
              { characterId: "3" },
              { characterId: "outsider-a" },
              { characterId: "outsider-c" },
            ],
          },
        },
      },
    });

    if (latestObservation?.update.type !== "UPSERT")
      throw new Error("Missing gathering update");
    expect(latestObservation.update.gathering.volunteers).toEqual([
      {
        characterId: "3",
        nick: "Author",
        icon: "icon",
        lvl: 100,
        prof: "w",
        partyPresence: "IN_PARTY",
      },
      {
        characterId: "5",
        nick: "Author",
        icon: "icon",
        lvl: 100,
        prof: "w",
        partyPresence: "OUTSIDE",
      },
    ]);
    expect(latestObservation.update.gathering.guildIds).toEqual([
      latestObservation.guildId,
    ]);

    state.now += PARTY_OBSERVATION_HEARTBEAT_MS;

    const heartbeat = await send(
      "POST",
      "/messaging/party-gathering/npc/party-observation",
      {
        organizerAccountId: "1",
        organizerCharacterId: "2",
        memberCharacterIds: ["2", "3", "outsider-a", "outsider-c"],
      },
    );

    const renewed = {
      revision: 7,
      partyState: {
        status: "OBSERVED",
        observedAt: new Date(state.now).toISOString(),
      },
    };

    expect(heartbeat.status).toBe(201);
    expect(await heartbeat.json()).toMatchObject(renewed);
    expect(stateEvents.at(-1)).toMatchObject({
      revision: 7,
      update: { type: "UPSERT", gathering: renewed },
    });

    const observeAtRevision = (memberCharacterIds: string[]) =>
      send("POST", "/messaging/party-gathering/npc/party-observation", {
        organizerAccountId: "1",
        organizerCharacterId: "2",
        memberCharacterIds,
        expectedRevision: 7,
      });

    state.delayNextCommit = true;
    const olderObservation = observeAtRevision(["2", "5"]);
    await olderCommitStarted.promise;

    const unchangedObservation = await observeAtRevision([
      "2",
      "3",
      "outsider-a",
      "outsider-c",
    ]);

    releaseOlderCommit.resolve();
    const delayedResponse = await olderObservation;

    expect(unchangedObservation.status).toBe(201);
    expect(await unchangedObservation.json()).toMatchObject({ revision: 8 });
    expect(delayedResponse.status).toBe(409);
    expect(await delayedResponse.json()).toMatchObject({
      code: "REVISION_CONFLICT",
    });

    const staleObservation = await observeAtRevision(["2", "5"]);
    expect(staleObservation.status).toBe(409);
    expect(await staleObservation.json()).toMatchObject({
      code: "REVISION_CONFLICT",
    });

    const recoveredRoom = await get("/messaging/party-gathering/npc");

    expect(await recoveredRoom.json()).toMatchObject({
      revision: 8,
      partyMemberCount: 4,
      participants: {
        alternate: { partyPresence: "IN_PARTY" },
        other: { partyPresence: "OUTSIDE" },
      },
    });

    const invitationTargets = await send(
      "POST",
      "/messaging/party-gathering/npc/invitations/targets",
      { participantIds: ["alternate", "other"] },
    );

    expect(await invitationTargets.json()).toEqual({
      targets: [{ participantId: "other", characterId: "5" }],
    });

    const afterObservation = await get(
      "/messaging/party-gathering/active?world=experimental",
    );

    expect(await afterObservation.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "npc",
          applicantCount: 2,
          inPartyCount: 1,
          partyMemberCount: 4,
        }),
      ]),
    );

    const withdrawal = await send(
      "DELETE",
      "/messaging/party-gathering/npc/applications/me",
      { participantId: "alternate" },
    );

    expect(withdrawal.status).toBe(200);
    expect(stateEvents.at(-1)).toMatchObject({
      update: {
        type: "UPSERT",
        gathering: {
          applicantCount: 1,
          volunteers: [{ characterId: "5" }],
          partyMemberCount: 4,
          partyState: {
            members: [
              { characterId: "2" },
              { characterId: "3" },
              { characterId: "outsider-a" },
              { characterId: "outsider-c" },
            ],
          },
        },
      },
    });

    const applyAs = (character: typeof base.organizerCharacter) =>
      send("POST", "/messaging/party-gathering/npc/applications", {
        world: base.world,
        character,
      });

    const sameAccount = await applyAs({
      ...base.organizerCharacter,
      characterId: "applicant",
    });

    expect(sameAccount.status).toBe(409);

    const apply = await applyAs({
      ...base.organizerCharacter,
      accountId: "4",
      characterId: "applicant",
    });

    expect(apply.status).toBe(201);
    const application = await apply.json();
    expect(stateEvents.at(-1)).toMatchObject({
      update: {
        type: "UPSERT",
        gathering: {
          applicantCount: 2,
          volunteers: [
            { characterId: "5", partyPresence: "OUTSIDE" },
            { characterId: "applicant", partyPresence: "OUTSIDE" },
          ],
          partyMemberCount: 4,
        },
      },
    });

    const registered = Object.keys(application.participants).find(
      (key) => key !== "organizer" && key !== "other",
    );

    expect(registered).toBeDefined();

    const removal = await send(
      "DELETE",
      "/messaging/party-gathering/npc/participants",
      {
        expectedRevision: application.revision,
        participantId: registered,
      },
    );

    expect(removal.status).toBe(200);
    expect(stateEvents.at(-1)).toMatchObject({
      update: {
        type: "UPSERT",
        gathering: {
          applicantCount: 1,
          volunteers: [{ characterId: "5" }],
          partyMemberCount: 4,
        },
      },
    });

    const afterWithdrawal = await get(
      "/messaging/party-gathering/active?world=experimental",
    );

    expect(await afterWithdrawal.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "npc",
          applicantCount: 1,
          inPartyCount: 0,
          partyMemberCount: 4,
        }),
      ]),
    );

    querySpy.mockClear();

    const list = await get("/messaging/party-gathering");

    expect(list.status).toBe(200);
    expect(querySpy).toHaveBeenCalledTimes(2);
    expect(await list.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "own-filtered",
          viewer: "ORGANIZER",
          guildIds: ["visible"],
        }),
      ]),
    );

    const detail = await get("/messaging/party-gathering/own-filtered");

    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      notificationId: "own-filtered",
      revision: 1,
      viewer: "ORGANIZER",
      guildIds: ["visible"],
    });

    const cancel = await send(
      "POST",
      "/messaging/party-gathering/own-filtered/cancel",
      { expectedRevision: 1 },
    );

    expect(cancel.status).toBe(201);
    expect(stateEvents.at(-1)).toMatchObject({
      notificationId: "own-filtered",
      npc: { type: "TITAN", lvl: 0 },
      update: { type: "REMOVE", notificationId: "own-filtered", revision: 2 },
    });
    expect(cancellationEvents).toEqual([
      { notificationId: "own-filtered", guildId: "visible" },
      { notificationId: "own-filtered", guildId: "hidden" },
    ]);
    expect(await cancel.json()).toMatchObject({
      type: "REMOVE",
      notificationId: "own-filtered",
    });
    expect(
      rooms.find((room) => room.notificationId === "own-filtered")?.status,
    ).toBe("CANCELLED");

    await databaseBoundary.run(
      databaseBoundary.database.insert(memberTable).values(
        createMemberFixture({
          id: 2,
          guildId: "hidden",
          userId: "owner",
          globalUserId: "user",
        }),
      ),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(roleTable).values({
        id: "hidden-sender",
        guildId: "hidden",
        name: "Sender",
        updatedAt: new Date(),
        permissions: [Capability.LOOTLOG_NOTIFICATIONS_SEND],
      }),
    );
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(memberToRoleTable)
        .values({ A: 2, B: "hidden-sender" }),
    );

    const createGathering = (
      target: { guildId: string } | { guildIds: string[] },
    ) =>
      send("POST", "/messaging/party-gathering", {
        ...target,
        world: base.world,
        character: base.organizerCharacter,
      });

    const roomCount = rooms.length;

    const broadcast = await createGathering({
      guildIds: ["visible", "hidden"],
    });

    expect(broadcast.status).toBe(400);
    expect(rooms).toHaveLength(roomCount);
    expect(gatheringEvents).toEqual([]);

    const created = await createGathering({ guildId: "visible" });

    expect(created.status).toBe(201);
    const createdRoom = await created.json();
    expect(createdRoom.guildIds).toEqual(["visible"]);
    expect(
      rooms.find((room) => room.notificationId === createdRoom.notificationId)
        ?.guildIds,
    ).toEqual(["visible"]);
    expect(stateEvents.at(-1)).toMatchObject({
      notificationId: createdRoom.notificationId,
      guildId: "visible",
    });
    expect(
      stateEvents.filter(
        (event) => event.notificationId === createdRoom.notificationId,
      ),
    ).toHaveLength(1);
    expect(gatheringEvents).toEqual([
      {
        notificationId: createdRoom.notificationId,
        guildId: "visible",
        discordId: state.caller.discordId,
        character: base.organizerCharacter,
        world: base.world,
        createdAt: createdRoom.createdAt,
      },
    ]);
    rooms.push({
      ...base,
      notificationId: "read-only-discovery",
      organizerDiscordId: "other",
    });
    await databaseBoundary.run(
      databaseBoundary.database
        .update(roleTable)
        .set({ permissions: [Capability.LOOTLOG_CHAT_READ] })
        .where(eq(roleTable.id, "sender")),
    );

    const readableGatherings = await get(
      "/messaging/party-gathering/active?world=experimental",
    );

    expect(readableGatherings.status).toBe(200);
    expect(await readableGatherings.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "read-only-discovery",
          guildIds: ["visible"],
        }),
      ]),
    );
    await databaseBoundary.run(
      databaseBoundary.database
        .update(roleTable)
        .set({ permissions: [Capability.LOOTLOG_NOTIFICATIONS_SEND] })
        .where(eq(roleTable.id, "sender")),
    );
    state.closeDatabaseOnCommit = true;

    const committedObservation = await send(
      "POST",
      "/messaging/party-gathering/minimal/party-observation",
      {
        organizerAccountId: "1",
        organizerCharacterId: "2",
        memberCharacterIds: ["2"],
      },
    );

    expect(committedObservation.status).toBe(201);
    expect(await committedObservation.json()).toEqual(
      expect.objectContaining({ partyMemberCount: 1, revision: 3 }),
    );
  } finally {
    releaseOlderCommit.resolve();
    querySpy.mockRestore();
    await boundary.dispose();
    await databaseBoundary.dispose();
  }
});
