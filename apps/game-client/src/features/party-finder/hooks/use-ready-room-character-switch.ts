import { useEffect, useRef } from "react";
import { Option, Schema } from "effect";
import {
  partyReadyRoomControllerApply,
  partyReadyRoomControllerWithdraw,
} from "@lootlog/client/main";
import {
  decodePartyReadyRoomClientUpdate,
  decodePartyReadyRoomProjection,
  type PartyGatheringSummary,
  type PartyReadyRoomParticipant,
} from "@lootlog/schema/party-ready-room";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { useActivePartyGatherings } from "@/features/chat/hooks/use-active-party-gatherings";
import {
  useReadyRoomProjections,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { storageKey } from "@/lib/storage-key";
import { useGameStore } from "@/store/game.store";

const APPLICATIONS_KEY = storageKey("ll:ready-room-applications");

const RecordedApplicationSchema = Schema.Struct({
  characterId: Schema.String,
  notificationId: Schema.String,
  expiresAt: Schema.Number,
});

type RecordedApplication = typeof RecordedApplicationSchema.Type;

const decodeApplications = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Record(Schema.String, RecordedApplicationSchema),
  ),
);

const readApplications = (): Record<string, RecordedApplication> => {
  try {
    return Option.getOrElse(
      decodeApplications(localStorage.getItem(APPLICATIONS_KEY) ?? ""),
      () => ({}),
    );
  } catch {
    return {};
  }
};

/** Remembers, per Margonem account, the application its character holds. */
const writeApplication = (
  accountId: string,
  application: RecordedApplication | null,
) => {
  const now = Date.now();
  const stored = readApplications();
  const current = stored[accountId];

  // The effect runs on every room update; write only what changed.
  if (
    application === null
      ? current === undefined
      : current?.characterId === application.characterId &&
        current.notificationId === application.notificationId &&
        current.expiresAt === application.expiresAt
  )
    return;

  const applications = Object.fromEntries(
    Object.entries(stored).filter(
      ([id, entry]) => id !== accountId && entry.expiresAt > now,
    ),
  );

  if (application) applications[accountId] = application;

  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  } catch {
    // Storage is a fallback for a slow relog; the live room still works.
  }
};

// Statuses with which the server refuses the character itself, rather than
// failing for a moment.
const REFUSED_STATUSES = new Set([403, 409, 422]);

const fitsLevel = (
  gathering: Pick<PartyGatheringSummary, "minLvl" | "maxLvl">,
  level: number,
) =>
  level >= (gathering.minLvl ?? 0) && level <= (gathering.maxLvl ?? Infinity);

/**
 * A player who applied and then logs in to another character of the same
 * Margonem account keeps the application, now for the character they play.
 * When that character does not fit the gathering, the application ends.
 *
 * The server drops an application once its character has been offline for a
 * short grace period, which a slow relog can outlast; the account's last
 * application is remembered locally so the new character applies again.
 */
export function useReadyRoomCharacterSwitch(): void {
  const synchronized = useReadyRoomsSynchronized();
  const projections = useReadyRoomProjections();
  const discovery = useActivePartyGatherings();
  const { mergeProjection, applyUpdate } = useReadyRoomsCache();
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const level = useGameStore((state) => state.game?.hero.level);
  const world = useGameStore((state) => state.game?.world);
  const inFlight = useRef(new Set<string>());
  // Attempts that failed for this character; room updates do not repeat them.
  const failed = useRef(new Set<string>());

  useEffect(() => {
    if (
      !synchronized ||
      accountId === undefined ||
      characterId === undefined ||
      level === undefined ||
      world === undefined
    )
      return;

    const run = (notificationId: string, request: () => Promise<void>) => {
      const attempt = `${notificationId}:${characterId}`;

      if (inFlight.current.has(notificationId) || failed.current.has(attempt))
        return;

      inFlight.current.add(notificationId);
      void request()
        .catch((error) => {
          failed.current.add(attempt);
          console.warn("[ReadyRoom] Character switch failed:", error);
        })
        .finally(() => inFlight.current.delete(notificationId));
    };

    const withdraw = async (
      notificationId: string,
      participant: PartyReadyRoomParticipant,
    ) => {
      applyUpdate(
        decodePartyReadyRoomClientUpdate(
          await partyReadyRoomControllerWithdraw(
            { notificationId },
            { participantId: participant.participantId },
          ),
        ),
      );
    };

    // The server decides eligibility; a character it refuses ends the
    // application the previous character left behind.
    const apply = (
      notificationId: string,
      gatheringWorld: string,
      previous?: PartyReadyRoomParticipant,
    ) => {
      const character = buildCurrentCharacterPayload();

      if (!character) return;

      run(notificationId, async () => {
        try {
          mergeProjection(
            decodePartyReadyRoomProjection(
              await partyReadyRoomControllerApply(
                { notificationId },
                { world: gatheringWorld, character },
              ),
            ),
          );
        } catch (error) {
          const status = getApiErrorStatus(error);

          if (previous && status !== undefined && REFUSED_STATUSES.has(status))
            return withdraw(notificationId, previous);

          throw error;
        }
      });
    };

    const accountRooms = Object.values(projections).flatMap((room) => {
      if (room.viewer !== "PARTICIPANT") return [];

      const participants = Object.values(room.participants).filter(
        (participant) => participant.character.accountId === accountId,
      );

      return participants.length > 0 ? [{ room, participants }] : [];
    });

    for (const { room, participants } of accountRooms) {
      const current = participants.some(
        (participant) => participant.character.characterId === characterId,
      );

      if (current) {
        writeApplication(accountId, {
          characterId,
          notificationId: room.notificationId,
          expiresAt: Date.parse(room.expiresAt),
        });
        continue;
      }

      const [previous] = participants;

      if (!previous) continue;

      if (room.world === world && fitsLevel(room, level)) {
        apply(room.notificationId, room.world, previous);
      } else {
        run(room.notificationId, () => withdraw(room.notificationId, previous));
      }
    }

    if (accountRooms.length > 0) return;

    const recorded = readApplications()[accountId];

    if (!recorded) return;

    // The recorded character itself no longer applies: it withdrew, was
    // removed, or the gathering ended.
    if (recorded.characterId === characterId) {
      writeApplication(accountId, null);

      return;
    }

    const gathering = discovery.data.find(
      ({ notificationId }) => notificationId === recorded.notificationId,
    );

    if (discovery.isStale || discovery.isPending) return;

    writeApplication(accountId, null);

    if (gathering && fitsLevel(gathering, level))
      apply(gathering.notificationId, gathering.world);
  }, [
    synchronized,
    projections,
    discovery.data,
    discovery.isStale,
    discovery.isPending,
    accountId,
    characterId,
    level,
    world,
    mergeProjection,
    applyUpdate,
  ]);
}
