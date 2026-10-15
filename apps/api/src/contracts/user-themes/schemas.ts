/** Shared input and output schemas for a User's own web themes. */
import { Schema } from "effect";
import { IsoDateTime } from "@lootlog/schema/primitives";
import {
  CustomThemeDefinitionSchema,
  CustomThemeNameSchema,
} from "@lootlog/schema/custom-theme";

export const UserThemeResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  definition: CustomThemeDefinitionSchema,
  /** Set while the theme is shared by link; `null` once sharing stops. */
  shareToken: Schema.NullOr(Schema.String),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
}).annotate({ identifier: "UserThemeResponseDto" });

export type UserThemeResponse = typeof UserThemeResponse.Type;

export const UserThemesResponse = Schema.Array(UserThemeResponse);

export const CreateUserThemeRequest = Schema.Struct({
  name: CustomThemeNameSchema,
  definition: CustomThemeDefinitionSchema,
}).annotate({ identifier: "CreateUserThemeDto" });

export type CreateUserThemeRequest = typeof CreateUserThemeRequest.Type;

export const UpdateUserThemeRequest = Schema.Struct({
  name: Schema.optionalKey(CustomThemeNameSchema),
  definition: Schema.optionalKey(CustomThemeDefinitionSchema),
}).annotate({ identifier: "UpdateUserThemeDto" });

export type UpdateUserThemeRequest = typeof UpdateUserThemeRequest.Type;

export const UserThemeParams = Schema.Struct({
  themeId: Schema.String,
});

export const SharedUserThemeParams = Schema.Struct({
  shareToken: Schema.String,
});

/** What a share link reveals: the theme itself, never who made it. */
export const SharedUserThemeResponse = Schema.Struct({
  name: Schema.String,
  definition: CustomThemeDefinitionSchema,
}).annotate({ identifier: "SharedUserThemeResponseDto" });
