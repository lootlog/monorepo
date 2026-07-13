import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

export const READY_ROOM_REPOSITORY = Symbol("READY_ROOM_REPOSITORY");

export type CreateReadyRoomResult =
  | { status: "created"; aggregate: ReadyRoomAggregate }
  | { status: "active-room-exists"; notificationId: string }
  | { status: "room-exists" };

export type CommitReadyRoomResult =
  | { status: "committed"; aggregate: ReadyRoomAggregate }
  | { status: "conflict" }
  | { status: "missing" };

export interface ReadyRoomRepository {
  create(aggregate: ReadyRoomAggregate): Promise<CreateReadyRoomResult>;
  get(notificationId: string): Promise<ReadyRoomAggregate | null>;
  saveApplication(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantDiscordId: string,
  ): Promise<CommitReadyRoomResult>;
}
