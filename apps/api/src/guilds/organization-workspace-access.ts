import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Schema } from "effect";

export type OrganizationWorkspaceIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class OrganizationWorkspaceOperationError extends TaggedErrorClass<OrganizationWorkspaceOperationError>()(
  "OrganizationWorkspaceOperationError",
  { cause: Schema.Defect() },
) {}
