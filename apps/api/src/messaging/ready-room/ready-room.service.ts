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
  PartyReadyRoomClientUpdate,
  PartyReadyRoomInvitationTarget,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { ChatService } from "#src/chat/chat.service";
import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import { ReadyRoomPublisher } from "#src/messaging/ready-room/ready-room-publisher";
import {
  READY_ROOM_REPOSITORY,
  type ReadyRoomRepository,
} from "#src/messaging/ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

type Clock = () => number;
type IdGenerator = () => string;

export const READY_ROOM_CLOCK = Symbol("READY_ROOM_CLOCK");
export const READY_ROOM_ID_GENERATOR = Symbol("READY_ROOM_ID_GENERATOR");
export const READY_ROOM_PARTICIPANT_ID_GENERATOR = Symbol(
  "READY_ROOM_PARTICIPANT_ID_GENERATOR",
);

const ROOM_LIFETIME_MS = 30 * 60 * 1000;
const MAX_CAS_ATTEMPTS = 4;

export interface CreateReadyRoomCommand {
  notificationId?: string;
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
}

export interface JoinReadyRoomCommand {
  notificationId: string;
  participantDiscordId: string;
  character: PartyReadyRoomCharacter;
  world: string;
  accessibleGuildIds: string[];
}

export interface ReadyRoomOrganizerParticipantCommand {
  notificationId: string;
  organizerDiscordId: string;
  participantId: string;
  expectedRevision: number;
}

export interface WithdrawFromReadyRoomCommand {
  notificationId: string;
  participantDiscordId: string;
  participantId: string;
}

export interface ObserveReadyRoomPartyCommand {
  notificationId: string;
  organizerDiscordId: string;
  organizerAccountId: string;
  organizerCharacterId: string;
  memberCharacterIds: string[];
}

export interface ResolveReadyRoomInvitationTargetsCommand {
  notificationId: string;
  organizerDiscordId: string;
  participantIds: string[];
}

export interface CancelReadyRoomCommand {
  notificationId: string;
  organizerDiscordId: string;
  expectedRevision: number;
}

export interface AccessReadyRoomCommand {
  notificationId: string;
  viewerDiscordId: string;
  accessibleGuildIds: string[];
}

export interface ListReadyRoomsCommand {
  viewerDiscordId: string;
  accessibleGuildIds: string[];
}

function createParticipant(
  command: JoinReadyRoomCommand,
  participantId: string,
  timestamp: string,
): PartyReadyRoomParticipant {
  return {
    participantId,
    discordId: command.participantDiscordId,
    character: structuredClone(command.character),
    partyPresence: "OUTSIDE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function characterOwnershipMatches(
  participant: PartyReadyRoomParticipant,
  command: JoinReadyRoomCommand,
): boolean {
  return (
    participant.discordId === command.participantDiscordId &&
    participant.character.accountId === command.character.accountId &&
    participant.character.characterId === command.character.characterId
  );
}

@Injectable()
export class ReadyRoomService {
  constructor(
    @Inject(READY_ROOM_REPOSITORY)
    private readonly repository: ReadyRoomRepository,
    private readonly chatService: ChatService,
    @Optional()
    @Inject(READY_ROOM_CLOCK)
    private readonly clock: Clock = Date.now,
    @Optional()
    @Inject(READY_ROOM_ID_GENERATOR)
    private readonly idGenerator: IdGenerator = randomUUID,
    @Optional()
    private readonly publisher?: ReadyRoomPublisher,
    @Optional()
    @Inject(READY_ROOM_PARTICIPANT_ID_GENERATOR)
    private readonly participantIdGenerator: IdGenerator = randomUUID,
  ) {}

  async get(
    command: AccessReadyRoomCommand,
  ): Promise<PartyReadyRoomProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    const projection = createReadyRoomProjection(
      aggregate,
      command.viewerDiscordId,
    );
    const sharesGuild = command.accessibleGuildIds.some((guildId) =>
      aggregate.guildIds.includes(guildId),
    );
    if (!projection || !sharesGuild) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }
    return projection;
  }

  async list(
    command: ListReadyRoomsCommand,
  ): Promise<PartyReadyRoomProjection[]> {
    const aggregates = await this.repository.findForUser(
      command.viewerDiscordId,
    );
    const aggregatesByNotificationId = new Map(
      aggregates.map((aggregate) => [aggregate.notificationId, aggregate]),
    );

    return [...aggregatesByNotificationId.values()].flatMap((aggregate) => {
      const isLive =
        aggregate.status === "ACTIVE" &&
        Date.parse(aggregate.expiresAt) > this.clock();
      const sharesGuild = command.accessibleGuildIds.some((guildId) =>
        aggregate.guildIds.includes(guildId),
      );
      if (!isLive || !sharesGuild) return [];
      const projection = createReadyRoomProjection(
        aggregate,
        command.viewerDiscordId,
      );
      return projection ? [projection] : [];
    });
  }

  async create(
    command: CreateReadyRoomCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const createdAtMs = this.clock();
    const createdAt = new Date(createdAtMs).toISOString();
    const aggregate: ReadyRoomAggregate = {
      schemaVersion: 3,
      notificationId: command.notificationId ?? this.idGenerator(),
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
      participants: {},
    };

    const result = await this.repository.create(aggregate);
    if (result.status === "active-room-exists") {
      throw new ConflictException({
        code: "ACTIVE_GATHERING_EXISTS",
        notificationId: result.notificationId,
      });
    }
    if (result.status === "joined-elsewhere") {
      throw new ConflictException({
        code: "ALREADY_JOINED_ELSEWHERE",
        notificationId: result.notificationId,
      });
    }
    if (result.status === "room-exists") {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }

    await this.publish(result.aggregate, [command.organizerDiscordId]);
    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

  join(command: JoinReadyRoomCommand): Promise<PartyReadyRoomProjection> {
    return this.joinWithRetry(command, 0);
  }

  private async joinWithRetry(
    command: JoinReadyRoomCommand,
    attempt: number,
  ): Promise<PartyReadyRoomProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    if (
      aggregate.organizerCharacter.characterId === command.character.characterId
    ) {
      throw new ConflictException({ code: "CHARACTER_ALREADY_JOINED" });
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

    const existingParticipant = Object.values(aggregate.participants).find(
      ({ character }) =>
        character.characterId === command.character.characterId,
    );
    if (existingParticipant) {
      if (!characterOwnershipMatches(existingParticipant, command)) {
        throw new ConflictException({ code: "CHARACTER_ALREADY_JOINED" });
      }
      return createReadyRoomProjection(
        aggregate,
        command.participantDiscordId,
      ) as PartyReadyRoomProjection;
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const participantId = this.participantIdGenerator();
    const participant = createParticipant(command, participantId, updatedAt);
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [participantId]: participant,
      },
    };
    const result = await this.repository.join(
      aggregate,
      nextAggregate,
      participantId,
    );
    if (result.status === "joined-elsewhere") {
      throw new ConflictException({
        code: "ALREADY_JOINED_ELSEWHERE",
        notificationId: result.notificationId,
      });
    }
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.joinWithRetry(command, attempt + 1);
    }

    await this.publish(result.aggregate, [
      result.aggregate.organizerDiscordId,
      command.participantDiscordId,
    ]);
    return createReadyRoomProjection(
      result.aggregate,
      command.participantDiscordId,
    ) as PartyReadyRoomProjection;
  }

  withdraw(
    command: WithdrawFromReadyRoomCommand,
  ): Promise<PartyReadyRoomClientUpdate> {
    return this.withdrawWithRetry(command, 0);
  }

  private async withdrawWithRetry(
    command: WithdrawFromReadyRoomCommand,
    attempt: number,
  ): Promise<PartyReadyRoomClientUpdate> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    const participant = aggregate.participants[command.participantId];
    if (
      !participant ||
      participant.discordId !== command.participantDiscordId
    ) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }

    const recipientDiscordIds =
      getReadyRoomActiveRecipientDiscordIds(aggregate);
    const updatedAt = new Date(this.clock()).toISOString();
    const participants = { ...aggregate.participants };
    delete participants[command.participantId];
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants,
    };
    const result = await this.repository.exitParticipant(
      aggregate,
      nextAggregate,
      command.participantId,
    );
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.withdrawWithRetry(command, attempt + 1);
    }

    await this.publish(result.aggregate, recipientDiscordIds);
    return createReadyRoomClientUpdate(
      result.aggregate,
      command.participantDiscordId,
    );
  }

  async remove(
    command: ReadyRoomOrganizerParticipantCommand,
  ): Promise<PartyReadyRoomClientUpdate> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    this.assertOrganizerRevision(
      aggregate,
      command.organizerDiscordId,
      command.expectedRevision,
    );
    const participant = aggregate.participants[command.participantId];
    if (!participant) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const recipientDiscordIds =
      getReadyRoomActiveRecipientDiscordIds(aggregate);
    const updatedAt = new Date(this.clock()).toISOString();
    const participants = { ...aggregate.participants };
    delete participants[command.participantId];
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants,
    };
    const result = await this.repository.exitParticipant(
      aggregate,
      nextAggregate,
      command.participantId,
    );
    this.assertCommitResult(result);
    await this.publish(result.aggregate, recipientDiscordIds);
    return createReadyRoomClientUpdate(
      result.aggregate,
      command.organizerDiscordId,
    );
  }

  observeParty(
    command: ObserveReadyRoomPartyCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    return this.observePartyWithRetry(command, 0);
  }

  private async observePartyWithRetry(
    command: ObserveReadyRoomPartyCommand,
    attempt: number,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    if (
      aggregate.organizerDiscordId !== command.organizerDiscordId ||
      aggregate.organizerCharacter.accountId !== command.organizerAccountId ||
      aggregate.organizerCharacter.characterId !== command.organizerCharacterId
    ) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }

    const memberCharacterIds = new Set(command.memberCharacterIds);
    const participants = structuredClone(aggregate.participants);
    const updatedAt = new Date(this.clock()).toISOString();
    const changedParticipantDiscordIds: string[] = [];
    for (const participant of Object.values(participants)) {
      const partyPresence = memberCharacterIds.has(
        participant.character.characterId,
      )
        ? "IN_PARTY"
        : "OUTSIDE";
      if (participant.partyPresence !== partyPresence) {
        participant.partyPresence = partyPresence;
        participant.updatedAt = updatedAt;
        changedParticipantDiscordIds.push(participant.discordId);
      }
    }
    if (changedParticipantDiscordIds.length === 0) {
      return createReadyRoomProjection(
        aggregate,
        command.organizerDiscordId,
      ) as PartyReadyRoomOrganizerProjection;
    }

    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants,
    };
    const result = await this.repository.commit(aggregate, nextAggregate);
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.observePartyWithRetry(command, attempt + 1);
    }

    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      ...changedParticipantDiscordIds,
    ]);
    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

  async resolveInvitationTargets(
    command: ResolveReadyRoomInvitationTargetsCommand,
  ): Promise<{ targets: PartyReadyRoomInvitationTarget[] }> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    if (aggregate.organizerDiscordId !== command.organizerDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }

    const participantIds = new Set(command.participantIds);
    const characterIds = new Set<string>();
    const targets: PartyReadyRoomInvitationTarget[] = [];
    for (const participantId of participantIds) {
      const participant = aggregate.participants[participantId];
      if (
        !participant ||
        participant.partyPresence !== "OUTSIDE" ||
        characterIds.has(participant.character.characterId)
      ) {
        continue;
      }
      characterIds.add(participant.character.characterId);
      targets.push({
        participantId,
        characterId: participant.character.characterId,
      });
    }
    return { targets };
  }

  async cancel(
    command: CancelReadyRoomCommand,
  ): Promise<PartyReadyRoomClientUpdate> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    this.assertOrganizerRevision(
      aggregate,
      command.organizerDiscordId,
      command.expectedRevision,
    );
    const recipientDiscordIds =
      getReadyRoomActiveRecipientDiscordIds(aggregate);
    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      status: "CANCELLED",
      revision: aggregate.revision + 1,
      updatedAt,
    };
    const result = await this.repository.terminate(aggregate, nextAggregate);
    this.assertCommitResult(result);
    await this.chatService.endPartyGatheringMessages(
      result.aggregate.notificationId,
      result.aggregate.guildIds,
    );
    await this.publish(result.aggregate, recipientDiscordIds);
    return createReadyRoomClientUpdate(
      result.aggregate,
      command.organizerDiscordId,
    );
  }

  private async getLiveAggregate(
    notificationId: string,
  ): Promise<ReadyRoomAggregate> {
    const aggregate = await this.repository.get(notificationId);
    if (!aggregate || Date.parse(aggregate.expiresAt) <= this.clock()) {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (aggregate.status !== "ACTIVE") {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }
    return aggregate;
  }

  private publish(
    aggregate: ReadyRoomAggregate,
    recipientDiscordIds: string[],
  ): Promise<void> {
    return (
      this.publisher?.publish(aggregate, recipientDiscordIds) ??
      Promise.resolve()
    );
  }

  private assertOrganizerRevision(
    aggregate: ReadyRoomAggregate,
    organizerDiscordId: string,
    expectedRevision: number,
  ): void {
    if (aggregate.organizerDiscordId !== organizerDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }
    if (aggregate.revision !== expectedRevision) {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }
  }

  private assertCommitResult(
    result: Awaited<ReturnType<ReadyRoomRepository["commit"]>>,
  ): asserts result is Extract<typeof result, { status: "committed" }> {
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }
  }
}
