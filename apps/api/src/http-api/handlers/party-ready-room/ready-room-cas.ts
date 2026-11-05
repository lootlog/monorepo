import { Effect } from "effect";

import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  ResourceConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { CommitReadyRoomResult } from "./ready-room.repository.js";

export const MAX_CAS_ATTEMPTS = 4;

export const assertOrganizer = (
  aggregate: ReadyRoomAggregate,
  discordId: string,
  revision: number,
) => {
  if (aggregate.organizerDiscordId !== discordId) {
    return Effect.fail(new PermissionDeniedError({ code: "FORBIDDEN" }));
  }

  return aggregate.revision === revision
    ? Effect.void
    : Effect.fail(new ResourceConflictError({ code: "REVISION_CONFLICT" }));
};

export const assertCommitted = (result: CommitReadyRoomResult) => {
  if (result.status === "missing") {
    return Effect.fail(new ResourceNotFoundError({ code: "ROOM_EXPIRED" }));
  }

  if (result.status === "conflict") {
    return Effect.fail(
      new ResourceConflictError({ code: "REVISION_CONFLICT" }),
    );
  }

  return Effect.succeed(result);
};
