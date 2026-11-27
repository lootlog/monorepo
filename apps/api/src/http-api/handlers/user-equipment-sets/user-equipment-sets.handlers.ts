import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  httpErrorResponse,
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  type StoredUserEquipmentSet,
  type UserEquipmentSetLimitReached,
  UserEquipmentSetNotFound,
  UserEquipmentSetsData,
  UserEquipmentSetsPersistenceError,
} from "#src/users/user-equipment-sets-data";
import { statusCodeResponse } from "#src/shared/http/handler-response";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";
import {
  type CreateUserEquipmentSetRequest,
  type UpdateUserEquipmentSetRequest,
  UserEquipmentSetResponse,
} from "#src/contracts/user-equipment-sets/schemas";

export class UserEquipmentSetsIdentity extends Context.Service<
  UserEquipmentSetsIdentity,
  { readonly userId: Effect.Effect<string, never, ForwardAuthIdentity> }
>()("@lootlog/api/http-api/user-equipment-sets/identity") {}

const decodeSet = (set: StoredUserEquipmentSet) =>
  Schema.decodeEffect(Schema.toType(UserEquipmentSetResponse))(set).pipe(
    Effect.mapError(
      (cause) => new UserEquipmentSetsPersistenceError({ cause }),
    ),
  );

const currentUser = Effect.gen(function* () {
  const identity = yield* UserEquipmentSetsIdentity;
  const userId = yield* identity.userId;
  const data = yield* UserEquipmentSetsData;

  return { userId, data };
});

export const getUserEquipmentSets = Effect.fn("getUserEquipmentSets")(
  function* () {
    const { userId, data } = yield* currentUser;
    const sets = yield* data.findMany(userId);

    return yield* Effect.forEach(sets, decodeSet);
  },
);

export const createUserEquipmentSet = Effect.fn("createUserEquipmentSet")(
  function* (payload: CreateUserEquipmentSetRequest) {
    const { userId, data } = yield* currentUser;

    return yield* decodeSet(yield* data.create(userId, payload));
  },
);

export const updateUserEquipmentSet = Effect.fn("updateUserEquipmentSet")(
  function* (setId: string, payload: UpdateUserEquipmentSetRequest) {
    const { userId, data } = yield* currentUser;
    const updated = yield* data.update(userId, setId, payload);

    if (updated === null) {
      return yield* new UserEquipmentSetNotFound({ status: 404 });
    }

    return yield* decodeSet(updated);
  },
);

export const deleteUserEquipmentSet = Effect.fn("deleteUserEquipmentSet")(
  function* (setId: string) {
    const { userId, data } = yield* currentUser;

    if (!(yield* data.delete(userId, setId))) {
      return yield* new UserEquipmentSetNotFound({ status: 404 });
    }

    return { success: true };
  },
);

type UserEquipmentSetsHttpFailure =
  | UserEquipmentSetNotFound
  | UserEquipmentSetLimitReached
  | UserEquipmentSetsPersistenceError
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, UserEquipmentSetsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    UserEquipmentSetNotFound: statusCodeResponse,
    UserEquipmentSetLimitReached: ({ equipmentSetLimit }) =>
      Effect.succeed(
        httpErrorResponse(409, {
          code: "USER_EQUIPMENT_SET_LIMIT_REACHED",
          details: { equipmentSetLimit },
        }),
      ),
    ReauthenticationRequired: reauthenticationRequiredResponse,
    UserEquipmentSetsPersistenceError: (error) => Effect.die(error.cause),
  });

export const UserEquipmentSetsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "user-equipment-sets",
  (handlers) =>
    handlers
      .handle("UserEquipmentSetsControllerGetSets", () =>
        toHttpResponse(getUserEquipmentSets()),
      )
      .handle("UserEquipmentSetsControllerCreateSet", ({ payload }) =>
        toHttpResponse(createUserEquipmentSet(payload)),
      )
      .handle("UserEquipmentSetsControllerUpdateSet", ({ params, payload }) =>
        toHttpResponse(updateUserEquipmentSet(params.setId, payload)),
      )
      .handle("UserEquipmentSetsControllerDeleteSet", ({ params }) =>
        toHttpResponse(deleteUserEquipmentSet(params.setId)),
      ),
);
