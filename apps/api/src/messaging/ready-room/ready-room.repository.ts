import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

export const READY_ROOM_REPOSITORY = Symbol("READY_ROOM_REPOSITORY");

export type CreateReadyRoomResult =
  | { status: "created"; aggregate: ReadyRoomAggregate }
  | { status: "active-room-exists"; notificationId: string }
  | { status: "joined-elsewhere"; notificationId: string }
  | { status: "room-exists" };

export type CommitReadyRoomResult =
  | { status: "committed"; aggregate: ReadyRoomAggregate }
  | { status: "conflict" }
  | { status: "missing" };

export type JoinReadyRoomResult =
  | CommitReadyRoomResult
  | { status: "joined-elsewhere"; notificationId: string };

export interface ReadyRoomRepository {
  create(aggregate: ReadyRoomAggregate): Promise<CreateReadyRoomResult>;
  get(notificationId: string): Promise<ReadyRoomAggregate | null>;
  findForUser(discordId: string): Promise<ReadyRoomAggregate[]>;
  commit(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult>;
  join(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<JoinReadyRoomResult>;
  exitParticipant(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<CommitReadyRoomResult>;
  terminate(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult>;
}
