import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Permission } from "@lootlog/schema/permissions";
import type { guildTable } from "#src/database/drizzle/schema";
import { GuildsService } from "#src/guilds/guilds.service";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";
import { ReservationSharingRepository } from "./reservation-sharing.repository.js";

type Guild = typeof guildTable.$inferSelect;

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getGuildIconUrl(guild: Pick<Guild, "id" | "icon">): string | null {
  if (!guild.icon) {
    return null;
  }

  const extension = guild.icon.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=128`;
}

function orderGuildPair(firstGuildId: string, secondGuildId: string) {
  return firstGuildId < secondGuildId
    ? ([firstGuildId, secondGuildId] as const)
    : ([secondGuildId, firstGuildId] as const);
}

@Injectable()
export class ReservationSharingService {
  constructor(
    private readonly repository: ReservationSharingRepository,
    private readonly guildsService: Pick<
      GuildsService,
      "getGuildsForRequiredPermissions"
    >,
    private readonly eventsPublisher: ReservationEventsPublisher,
  ) {}

  async getVisibleGuildIds(guildId: string): Promise<string[]> {
    const shares = await this.repository.findActiveShares(guildId);

    return [
      guildId,
      ...shares.map((share) =>
        share.firstGuildId === guildId
          ? share.secondGuildId
          : share.firstGuildId,
      ),
    ];
  }

  async list(guildId: string) {
    const now = new Date();
    const [shares, pendingInvitations] = await Promise.all([
      this.repository.listActiveSharesWithGuilds(guildId),
      this.repository.findPendingInvitations(guildId, now),
    ]);

    return {
      shares: shares.map((share) => {
        const partner =
          share.firstGuildId === guildId ? share.secondGuild : share.firstGuild;

        return {
          id: share.id,
          partner: {
            name: partner.name,
            iconUrl: getGuildIconUrl(partner),
          },
          createdAt: share.createdAt,
        };
      }),
      pendingInvitations: pendingInvitations.map((invitation) => ({
        id: invitation.id,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    };
  }

  async createInvitation(guildId: string, userId: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation = await this.repository.createInvitation({
      sourceGuildId: guildId,
      tokenHash: this.hashToken(token),
      createdByUserId: userId,
      expiresAt,
    });
    const invitePath = `/reservation-sharing/invitations/${token}`;

    return {
      id: invitation.id,
      invitePath,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async previewInvitation(token: string, discordId: string) {
    const invitation = await this.getUsableInvitation(token);
    const administrativeGuilds =
      await this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.OWNER,
        Permission.ADMIN,
      ]);
    const existingPartnerIds = new Set(
      await this.getVisibleGuildIds(invitation.sourceGuildId),
    );
    const eligibleTargetOrganizations = administrativeGuilds
      .filter((guild) => !existingPartnerIds.has(guild.id))
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        iconUrl: getGuildIconUrl(guild),
      }));

    return {
      sourceOrganization: {
        name: invitation.sourceGuild.name,
        iconUrl: getGuildIconUrl(invitation.sourceGuild),
      },
      expiresAt: invitation.expiresAt,
      eligibleTargetOrganizations,
    };
  }

  async acceptInvitation(options: {
    token: string;
    targetGuildId: string;
    userId: string;
    discordId: string;
  }) {
    const invitation = await this.getUsableInvitation(options.token);
    const administrativeGuilds =
      await this.guildsService.getGuildsForRequiredPermissions(
        options.discordId,
        [Permission.OWNER, Permission.ADMIN],
      );
    const targetGuild = administrativeGuilds.find(
      (guild) => guild.id === options.targetGuildId,
    );

    if (!targetGuild) {
      throw new NotFoundException({ code: "TARGET_ORGANIZATION_NOT_FOUND" });
    }
    if (targetGuild.id === invitation.sourceGuildId) {
      throw new ConflictException({ code: "RESERVATION_SHARE_WITH_SELF" });
    }

    const [firstGuildId, secondGuildId] = orderGuildPair(
      invitation.sourceGuildId,
      targetGuild.id,
    );
    const acceptResult = await this.repository.acceptInvitation({
      invitationId: invitation.id,
      sourceGuildId: invitation.sourceGuildId,
      targetGuildId: targetGuild.id,
      createdByUserId: invitation.createdByUserId,
      acceptedByUserId: options.userId,
      firstGuildId,
      secondGuildId,
    });
    if (acceptResult.kind === "expired") {
      throw new GoneException({ code: "INVITATION_EXPIRED" });
    }
    if (acceptResult.kind === "exists") {
      throw new ConflictException({ code: "RESERVATION_SHARE_EXISTS" });
    }
    if (acceptResult.kind === "insert-failed") {
      throw new Error("Reservation share insert returned no row");
    }
    const share = acceptResult.share;

    await this.eventsPublisher.sharingChanged(invitation.sourceGuildId, [
      invitation.sourceGuildId,
      targetGuild.id,
    ]);

    return {
      id: share.id,
      partner: {
        name: invitation.sourceGuild.name,
        iconUrl: getGuildIconUrl(invitation.sourceGuild),
      },
      createdAt: share.createdAt,
    };
  }

  async revokeInvitation(guildId: string, invitationId: string): Promise<void> {
    const revoked = await this.repository.revokeInvitation(
      guildId,
      invitationId,
    );
    if (!revoked) {
      throw new NotFoundException({ code: "INVITATION_NOT_FOUND" });
    }
  }

  async revokeShare(guildId: string, shareId: string): Promise<void> {
    const share = await this.repository.findActiveShare(guildId, shareId);
    if (!share) {
      throw new NotFoundException({ code: "RESERVATION_SHARE_NOT_FOUND" });
    }

    await this.repository.revokeShare(share.id);
    await this.eventsPublisher.sharingChanged(guildId, [
      share.firstGuildId,
      share.secondGuildId,
    ]);
  }

  private async getUsableInvitation(token: string) {
    const invitation = await this.repository.findInvitation(
      this.hashToken(token),
    );

    if (!invitation) {
      throw new NotFoundException({ code: "INVITATION_NOT_FOUND" });
    }
    if (invitation.acceptedAt) {
      throw new ConflictException({ code: "INVITATION_ALREADY_USED" });
    }
    if (invitation.revokedAt || invitation.expiresAt <= new Date()) {
      throw new GoneException({ code: "INVITATION_EXPIRED" });
    }

    return invitation;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
