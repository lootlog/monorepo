import { Context, Effect, Layer, Schema } from "effect";
import type { Permission } from "@lootlog/schema/permissions";
import type { MemberContextService } from "#src/shared/permissions/member-context.service";

export type OrganizationContext = {
  readonly guildId: string;
  readonly ownerId: string;
  readonly permissions: ReadonlyArray<Permission>;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class OrganizationNotFound extends Schema.TaggedError<OrganizationNotFound>()(
  "OrganizationNotFound",
  { guildId: Schema.String },
) {}

export class OrganizationContextLookup extends Context.Service<
  OrganizationContextLookup,
  {
    readonly lookup: (options: {
      readonly userId: string;
      readonly discordId: string;
      readonly guildId: string;
    }) => Effect.Effect<OrganizationContext | null, OrganizationNotFound>;
  }
>()("@lootlog/api/http-api/organization-context") {
  /**
   * Transitional adapter preserving the existing member lookup, Redis
   * fail-open behavior, vanity lookup, and owner permission expansion.
   */
  static layerLegacy(service: Pick<MemberContextService, "getMemberContext">) {
    return Layer.succeed(
      OrganizationContextLookup,
      OrganizationContextLookup.of({
        lookup: (options) =>
          Effect.tryPromise({
            try: () => service.getMemberContext(options),
            catch: (error) => error,
          }).pipe(
            Effect.catch((error) =>
              isHttpNotFound(error)
                ? Effect.fail(
                    new OrganizationNotFound({ guildId: options.guildId }),
                  )
                : Effect.die(error),
            ),
            Effect.map((context) =>
              context === null
                ? null
                : {
                    guildId: context.guild.id,
                    ownerId: context.guild.ownerId,
                    permissions: context.permissions,
                  },
            ),
          ),
      }),
    );
  }
}

const isHttpNotFound = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  "getStatus" in cause &&
  typeof cause.getStatus === "function" &&
  cause.getStatus() === 404;
