import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class RpcNotFoundError extends TaggedErrorClass<
  RpcNotFoundError,
  { readonly brand: unique symbol }
>()("RpcNotFoundError", {
  message: Schema.optionalKey(Schema.String),
}) {}

export class RpcForbiddenError extends TaggedErrorClass<
  RpcForbiddenError,
  { readonly brand: unique symbol }
>()("RpcForbiddenError", {
  message: Schema.optionalKey(Schema.String),
}) {}

export class RpcUnauthorizedError extends TaggedErrorClass<
  RpcUnauthorizedError,
  { readonly brand: unique symbol }
>()("RpcUnauthorizedError", {
  message: Schema.optionalKey(Schema.String),
}) {}

export class RpcBadRequestError extends TaggedErrorClass<
  RpcBadRequestError,
  { readonly brand: unique symbol }
>()("RpcBadRequestError", {
  message: Schema.optionalKey(Schema.String),
}) {}

export class RpcUnavailableError extends TaggedErrorClass<
  RpcUnavailableError,
  { readonly brand: unique symbol }
>()("RpcUnavailableError", {
  message: Schema.optionalKey(Schema.String),
}) {}

export class RpcCallerRejectedError extends TaggedErrorClass<
  RpcCallerRejectedError,
  { readonly brand: unique symbol }
>()("RpcCallerRejectedError", {}) {}
