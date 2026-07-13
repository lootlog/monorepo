import { randomUUID } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomParticipantProjection,
} from "@lootlog/types";
import { createReadyRoomProjection } from "src/messaging/ready-room/ready-room-projection";
import {
  READY_ROOM_REPOSITORY,
  type ReadyRoomRepository,
} from "src/messaging/ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

type Clock = () => number;
type IdGenerator = () => string;

export const READY_ROOM_CLOCK = Symbol("READY_ROOM_CLOCK");
export const READY_ROOM_ID_GENERATOR = Symbol("READY_ROOM_ID_GENERATOR");

const ROOM_LIFETIME_MS = 30 * 60 * 1000;
const MAX_CAS_ATTEMPTS = 4;

export interface CreateReadyRoomCommand {
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
}

export interface ApplyToReadyRoomCommand {
  notificationId: string;
  participantDiscordId: string;
  character: PartyReadyRoomCharacter;
  world: string;
  accessibleGuildIds: string[];
}

function createInitialParticipant(
  command: ApplyToReadyRoomCommand,
  timestamp: string,
): PartyReadyRoomParticipant {
  return {
    discordId: command.participantDiscordId,
    character: structuredClone(command.character),
    application: "APPLIED",
    readiness: "NOT_REQUESTED",
    invitation: {
      status: "NOT_MARKED",
      source: null,
      commandId: null,
      batchId: null,
      reservationExpiresAt: null,
      updatedAt: timestamp,
    },
    partyPresence: "OUTSIDE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

@Injectable()
export class ReadyRoomService {
  constructor(
    @Inject(READY_ROOM_REPOSITORY)
    private readonly repository: ReadyRoomRepository,
    @Optional()
    @Inject(READY_ROOM_CLOCK)
    private readonly clock: Clock = Date.now,
    @Optional()
    @Inject(READY_ROOM_ID_GENERATOR)
    private readonly idGenerator: IdGenerator = randomUUID,
  ) {}

  apply(
    command: ApplyToReadyRoomCommand,
  ): Promise<PartyReadyRoomParticipantProjection> {
    return this.applyWithRetry(command, 0);
  }

  private async applyWithRetry(
    command: ApplyToReadyRoomCommand,
    attempt: number,
  ): Promise<PartyReadyRoomParticipantProjection> {
    const aggregate = await this.repository.get(command.notificationId);
    if (!aggregate || Date.parse(aggregate.expiresAt) <= this.clock()) {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (aggregate.status !== "ACTIVE") {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }
    if (aggregate.organizerDiscordId === command.participantDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }

    const sharesGuild = command.accessibleGuildIds.some((guildId) =>
      aggregate.guildIds.includes(guildId),
    );
    const meetsLevelRange =
      (aggregate.minLvl === undefined ||
        command.character.lvl >= aggregate.minLvl) &&
      (aggregate.maxLvl === undefined ||
        command.character.lvl <= aggregate.maxLvl);
    if (!sharesGuild || command.world !== aggregate.world || !meetsLevelRange) {
      throw new ForbiddenException({ code: "INELIGIBLE_CHARACTER" });
    }

    const currentParticipant =
      aggregate.participants[command.participantDiscordId];
    if (currentParticipant?.application === "APPLIED") {
      if (
        currentParticipant.character.characterId !==
        command.character.characterId
      ) {
        throw new ConflictException({ code: "CHARACTER_ALREADY_APPLIED" });
      }

      return createReadyRoomProjection(
        aggregate,
        command.participantDiscordId,
      ) as PartyReadyRoomParticipantProjection;
    }
    if (currentParticipant?.application === "ACCEPTED") {
      throw new ConflictException({ code: "INVALID_STATE_TRANSITION" });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: createInitialParticipant(
          command,
          updatedAt,
        ),
      },
    };
    const result = await this.repository.saveApplication(
      aggregate,
      nextAggregate,
      command.participantDiscordId,
    );
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.applyWithRetry(command, attempt + 1);
    }

    return createReadyRoomProjection(
      result.aggregate,
      command.participantDiscordId,
    ) as PartyReadyRoomParticipantProjection;
  }

  async create(
    command: CreateReadyRoomCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const createdAtMs = this.clock();
    const createdAt = new Date(createdAtMs).toISOString();
    const aggregate: ReadyRoomAggregate = {
      notificationId: this.idGenerator(),
      organizerDiscordId: command.organizerDiscordId,
      organizerCharacter: structuredClone(command.organizerCharacter),
      guildIds: [...command.guildIds],
      world: command.world,
      ...(command.description === undefined
        ? {}
        : { description: command.description }),
      ...(command.minLvl === undefined ? {} : { minLvl: command.minLvl }),
      ...(command.maxLvl === undefined ? {} : { maxLvl: command.maxLvl }),
      status: "ACTIVE",
      revision: 1,
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(createdAtMs + ROOM_LIFETIME_MS).toISOString(),
      readyCheck: null,
      participants: {},
    };

    const result = await this.repository.create(aggregate);
    if (result.status === "active-room-exists") {
      throw new ConflictException({
        code: "ACTIVE_GATHERING_EXISTS",
        notificationId: result.notificationId,
      });
    }
    if (result.status === "room-exists") {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }
}
