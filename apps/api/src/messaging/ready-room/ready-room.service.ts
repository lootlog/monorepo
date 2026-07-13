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
  PartyReadyRoomInvitationBatch,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomParticipantProjection,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import {
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "src/messaging/ready-room/ready-room-projection";
import { ReadyRoomPublisher } from "src/messaging/ready-room/ready-room-publisher";
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
const INVITATION_RESERVATION_MS = 15 * 1000;
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

export interface AcceptReadyRoomParticipantCommand {
  notificationId: string;
  organizerDiscordId: string;
  participantDiscordId: string;
  expectedRevision: number;
}

export interface StartReadyRoomCheckCommand {
  notificationId: string;
  organizerDiscordId: string;
  expectedRevision: number;
}

export interface RespondToReadyRoomCheckCommand {
  notificationId: string;
  participantDiscordId: string;
  roundId: number;
  ready: boolean;
}

export interface WithdrawFromReadyRoomCommand {
  notificationId: string;
  participantDiscordId: string;
}

export interface ReserveReadyRoomInvitationsCommand {
  notificationId: string;
  organizerDiscordId: string;
  participantDiscordIds: string[];
  expectedRevision: number;
}

export interface AcknowledgeReadyRoomInvitationCommand {
  notificationId: string;
  organizerDiscordId: string;
  participantDiscordId: string;
  commandId: string;
  outcome: "SENT" | "FAILED";
}

export interface ObserveReadyRoomPartyCommand {
  notificationId: string;
  organizerDiscordId: string;
  memberCharacterIds: string[];
}

export interface ReserveReadyRoomInvitationsResult {
  projection: PartyReadyRoomOrganizerProjection;
  batch: PartyReadyRoomInvitationBatch;
}

export interface TerminateReadyRoomResult {
  projection: PartyReadyRoomOrganizerProjection;
  recipientDiscordIds: string[];
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

function resetParticipantCoordination(
  participant: PartyReadyRoomParticipant,
  application: "DECLINED" | "WITHDRAWN",
  updatedAt: string,
): PartyReadyRoomParticipant {
  return {
    ...participant,
    application,
    readiness: "NOT_REQUESTED",
    invitation: {
      status: "NOT_MARKED",
      source: null,
      commandId: null,
      batchId: null,
      reservationExpiresAt: null,
      updatedAt,
    },
    partyPresence: "OUTSIDE",
    updatedAt,
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
    @Optional()
    private readonly publisher?: ReadyRoomPublisher,
  ) {}

  async get(
    command: AccessReadyRoomCommand,
  ): Promise<PartyReadyRoomProjection> {
    const aggregate = await this.repository.get(command.notificationId);
    if (!aggregate || Date.parse(aggregate.expiresAt) <= this.clock()) {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
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
    return aggregates.flatMap((aggregate) => {
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

  close(
    command: StartReadyRoomCheckCommand,
  ): Promise<TerminateReadyRoomResult> {
    return this.terminate(command, "CLOSED");
  }

  cancel(
    command: StartReadyRoomCheckCommand,
  ): Promise<TerminateReadyRoomResult> {
    return this.terminate(command, "CANCELLED");
  }

  private async terminate(
    command: StartReadyRoomCheckCommand,
    status: "CLOSED" | "CANCELLED",
  ): Promise<TerminateReadyRoomResult> {
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
      status,
      revision: aggregate.revision + 1,
      updatedAt,
    };
    const result = await this.repository.terminate(
      aggregate,
      nextAggregate,
      Object.keys(aggregate.participants),
    );
    this.assertOrganizerCommitResult(result);
    await this.publish(result.aggregate, recipientDiscordIds);

    return {
      projection: createReadyRoomProjection(
        result.aggregate,
        command.organizerDiscordId,
      ) as PartyReadyRoomOrganizerProjection,
      recipientDiscordIds,
    };
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
    if (aggregate.organizerDiscordId !== command.organizerDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }

    const memberCharacterIds = new Set(command.memberCharacterIds);
    const participants = structuredClone(aggregate.participants);
    const updatedAt = new Date(this.clock()).toISOString();
    const changedParticipantDiscordIds: string[] = [];
    for (const participant of Object.values(participants)) {
      if (participant.application !== "ACCEPTED") continue;
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
      if (attempt + 1 < MAX_CAS_ATTEMPTS) {
        return this.observePartyWithRetry(command, attempt + 1);
      }
      const latestAggregate = await this.getLiveAggregate(
        command.notificationId,
      );
      return createReadyRoomProjection(
        latestAggregate,
        command.organizerDiscordId,
      ) as PartyReadyRoomOrganizerProjection;
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

  async reserveInvitations(
    command: ReserveReadyRoomInvitationsCommand,
  ): Promise<ReserveReadyRoomInvitationsResult> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    this.assertOrganizerRevision(
      aggregate,
      command.organizerDiscordId,
      command.expectedRevision,
    );

    const now = this.clock();
    const eligibleParticipants = [
      ...new Set(command.participantDiscordIds),
    ].flatMap((participantDiscordId) => {
      const participant = aggregate.participants[participantDiscordId];
      if (
        participant?.application !== "ACCEPTED" ||
        participant.partyPresence !== "OUTSIDE"
      ) {
        return [];
      }
      const reservationExpiresAt = participant.invitation.reservationExpiresAt;
      if (
        participant.invitation.status === "COMMAND_RESERVED" &&
        reservationExpiresAt &&
        Date.parse(reservationExpiresAt) > now
      ) {
        return [];
      }
      return [participant];
    });
    if (eligibleParticipants.length === 0) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const updatedAt = new Date(now).toISOString();
    const reservationExpiresAt = new Date(
      now + INVITATION_RESERVATION_MS,
    ).toISOString();
    const batchId = this.idGenerator();
    const participants = structuredClone(aggregate.participants);
    const reservations = eligibleParticipants.map((participant) => {
      const commandId = this.idGenerator();
      participants[participant.discordId] = {
        ...participant,
        invitation: {
          status: "COMMAND_RESERVED",
          source: "LOOTLOG_COMMAND",
          commandId,
          batchId,
          reservationExpiresAt,
          updatedAt,
        },
        updatedAt,
      };
      return {
        participantDiscordId: participant.discordId,
        characterId: participant.character.characterId,
        commandId,
      };
    });
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants,
    };
    const result = await this.repository.commit(aggregate, nextAggregate);
    this.assertOrganizerCommitResult(result);
    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      ...eligibleParticipants.map(({ discordId }) => discordId),
    ]);

    return {
      projection: createReadyRoomProjection(
        result.aggregate,
        command.organizerDiscordId,
      ) as PartyReadyRoomOrganizerProjection,
      batch: { batchId, reservations },
    };
  }

  acknowledgeInvitation(
    command: AcknowledgeReadyRoomInvitationCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    return this.acknowledgeInvitationWithRetry(command, 0);
  }

  private async acknowledgeInvitationWithRetry(
    command: AcknowledgeReadyRoomInvitationCommand,
    attempt: number,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    if (aggregate.organizerDiscordId !== command.organizerDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }
    const participant = aggregate.participants[command.participantDiscordId];
    if (
      participant?.invitation.commandId !== command.commandId ||
      participant.application !== "ACCEPTED"
    ) {
      throw new ConflictException({ code: "STALE_COMMAND" });
    }
    if (
      participant.invitation.status === command.outcome &&
      participant.invitation.source === "LOOTLOG_COMMAND"
    ) {
      return createReadyRoomProjection(
        aggregate,
        command.organizerDiscordId,
      ) as PartyReadyRoomOrganizerProjection;
    }
    if (participant.invitation.status !== "COMMAND_RESERVED") {
      throw new ConflictException({ code: "STALE_COMMAND" });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: {
          ...participant,
          invitation: {
            ...participant.invitation,
            status: command.outcome,
            source: "LOOTLOG_COMMAND",
            reservationExpiresAt: null,
            updatedAt,
          },
          updatedAt,
        },
      },
    };
    const result = await this.repository.commit(aggregate, nextAggregate);
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.acknowledgeInvitationWithRetry(command, attempt + 1);
    }
    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      command.participantDiscordId,
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

  decline(
    command: AcceptReadyRoomParticipantCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    return this.exitParticipantAsOrganizer(command, "APPLIED");
  }

  remove(
    command: AcceptReadyRoomParticipantCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    return this.exitParticipantAsOrganizer(command, "ACCEPTED");
  }

  private async exitParticipantAsOrganizer(
    command: AcceptReadyRoomParticipantCommand,
    expectedApplication: "APPLIED" | "ACCEPTED",
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    this.assertOrganizerRevision(
      aggregate,
      command.organizerDiscordId,
      command.expectedRevision,
    );
    const participant = aggregate.participants[command.participantDiscordId];
    if (participant?.application !== expectedApplication) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: resetParticipantCoordination(
          participant,
          "DECLINED",
          updatedAt,
        ),
      },
    };
    const result = await this.repository.exitParticipant(
      aggregate,
      nextAggregate,
      command.participantDiscordId,
    );
    this.assertOrganizerCommitResult(result);
    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      command.participantDiscordId,
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

  async startReadyCheck(
    command: StartReadyRoomCheckCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    this.assertOrganizerRevision(
      aggregate,
      command.organizerDiscordId,
      command.expectedRevision,
    );

    const acceptedParticipants = Object.values(aggregate.participants).filter(
      ({ application }) => application === "ACCEPTED",
    );
    if (acceptedParticipants.length === 0) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const participants = structuredClone(aggregate.participants);
    for (const participant of Object.values(participants)) {
      if (participant.application === "ACCEPTED") {
        participant.readiness = "PENDING";
        participant.updatedAt = updatedAt;
      }
    }
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      readyCheck: {
        roundId: (aggregate.readyCheck?.roundId ?? 0) + 1,
        startedAt: updatedAt,
      },
      participants,
    };
    const result = await this.repository.commit(aggregate, nextAggregate);
    this.assertOrganizerCommitResult(result);
    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      ...acceptedParticipants.map(({ discordId }) => discordId),
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

  respondToReadyCheck(
    command: RespondToReadyRoomCheckCommand,
  ): Promise<PartyReadyRoomParticipantProjection> {
    return this.respondToReadyCheckWithRetry(command, 0);
  }

  private async respondToReadyCheckWithRetry(
    command: RespondToReadyRoomCheckCommand,
    attempt: number,
  ): Promise<PartyReadyRoomParticipantProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    const participant = aggregate.participants[command.participantDiscordId];
    if (
      participant?.application !== "ACCEPTED" ||
      aggregate.readyCheck?.roundId !== command.roundId
    ) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const readiness = command.ready ? "READY" : "NOT_READY";
    if (participant.readiness === readiness) {
      return createReadyRoomProjection(
        aggregate,
        command.participantDiscordId,
      ) as PartyReadyRoomParticipantProjection;
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: {
          ...participant,
          readiness,
          updatedAt,
        },
      },
    };
    const result = await this.repository.commit(aggregate, nextAggregate);
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      if (attempt + 1 >= MAX_CAS_ATTEMPTS) {
        throw new ConflictException({ code: "REVISION_CONFLICT" });
      }
      return this.respondToReadyCheckWithRetry(command, attempt + 1);
    }
    await this.publish(result.aggregate, [
      result.aggregate.organizerDiscordId,
      command.participantDiscordId,
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.participantDiscordId,
    ) as PartyReadyRoomParticipantProjection;
  }

  withdraw(
    command: WithdrawFromReadyRoomCommand,
  ): Promise<PartyReadyRoomParticipantProjection> {
    return this.withdrawWithRetry(command, 0);
  }

  private async withdrawWithRetry(
    command: WithdrawFromReadyRoomCommand,
    attempt: number,
  ): Promise<PartyReadyRoomParticipantProjection> {
    const aggregate = await this.getLiveAggregate(command.notificationId);
    const participant = aggregate.participants[command.participantDiscordId];
    if (
      participant?.application !== "APPLIED" &&
      participant?.application !== "ACCEPTED"
    ) {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: {
          ...resetParticipantCoordination(participant, "WITHDRAWN", updatedAt),
        },
      },
    };
    const result = await this.repository.exitParticipant(
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
      return this.withdrawWithRetry(command, attempt + 1);
    }
    await this.publish(result.aggregate, [
      result.aggregate.organizerDiscordId,
      command.participantDiscordId,
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.participantDiscordId,
    ) as PartyReadyRoomParticipantProjection;
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

  private assertOrganizerCommitResult(
    result: Awaited<ReturnType<ReadyRoomRepository["commit"]>>,
  ): asserts result is Extract<typeof result, { status: "committed" }> {
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }
  }

  async accept(
    command: AcceptReadyRoomParticipantCommand,
  ): Promise<PartyReadyRoomOrganizerProjection> {
    const aggregate = await this.repository.get(command.notificationId);
    if (!aggregate || Date.parse(aggregate.expiresAt) <= this.clock()) {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (aggregate.organizerDiscordId !== command.organizerDiscordId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }
    if (
      aggregate.status !== "ACTIVE" ||
      aggregate.revision !== command.expectedRevision
    ) {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }

    const participant = aggregate.participants[command.participantDiscordId];
    if (!participant || participant.application !== "APPLIED") {
      throw new UnprocessableEntityException({
        code: "INVALID_STATE_TRANSITION",
      });
    }

    const updatedAt = new Date(this.clock()).toISOString();
    const nextAggregate: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [command.participantDiscordId]: {
          ...participant,
          application: "ACCEPTED",
          readiness: aggregate.readyCheck ? "PENDING" : "NOT_REQUESTED",
          updatedAt,
        },
      },
    };
    const result = await this.repository.accept(
      aggregate,
      nextAggregate,
      command.participantDiscordId,
    );
    if (result.status === "accepted-elsewhere") {
      throw new ConflictException({
        code: "ACCEPTED_ELSEWHERE",
        notificationId: result.notificationId,
      });
    }
    if (result.status === "missing") {
      throw new NotFoundException({ code: "ROOM_EXPIRED" });
    }
    if (result.status === "conflict") {
      throw new ConflictException({ code: "REVISION_CONFLICT" });
    }
    await this.publish(result.aggregate, [
      command.organizerDiscordId,
      command.participantDiscordId,
    ]);

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }

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
    await this.publish(result.aggregate, [
      result.aggregate.organizerDiscordId,
      command.participantDiscordId,
    ]);

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
    await this.publish(result.aggregate, [command.organizerDiscordId]);

    return createReadyRoomProjection(
      result.aggregate,
      command.organizerDiscordId,
    ) as PartyReadyRoomOrganizerProjection;
  }
}
