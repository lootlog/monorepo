import { MemberAvatar } from "@/components/common/member-avatar";
import { MemberProfileLink } from "@/components/common/member-profile-link";
import { MemberProfileRoles } from "@/components/common/member-profile-roles";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import type { MemberReferenceResponseDtoOutput as GuildMemberReference } from "@lootlog/client/main";
import { Capability } from "@lootlog/domain/access-policy";
import { discordRoleCssColor } from "@lootlog/domain/member-display-role";
import { Button } from "@lootlog/ui/components/button";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { toast } from "@lootlog/ui/lib/toast";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { format } from "date-fns";
import { AtSign, BarChart3, ExternalLink, Hash, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCopyToClipboard } from "usehooks-ts";

type MemberProfileCardProps = {
  member: GuildMemberReference;
  guildId: string;
  /** `MemberProfileLink` rows for the place the card was opened from. */
  links?: React.ReactNode;
};

/** A member's short profile: who they are on Discord and where to reach them. */
export const MemberProfileCard = ({
  member,
  guildId,
  links,
}: MemberProfileCardProps) => {
  const { t } = useTranslation();
  const { data: accessPolicy } = useGuildPermissions();
  const [, copy] = useCopyToClipboard();

  const roleColor = discordRoleCssColor(member.color);
  const bannerColor = roleColor ?? "var(--muted-foreground)";
  const displayName = member.displayName ?? member.name;
  // The server avatar hides the face people know from direct messages.
  const hasServerAvatar = member.avatar?.startsWith("http") ?? false;
  const memberParams = { guildId, memberId: String(member.id) };

  const copyValue = async (value: string, copiedMessage: string) => {
    if (await copy(value)) toast.success(copiedMessage);
    else toast.error(t("common.memberProfile.copyFailed"));
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "relative h-[72px] bg-cover bg-center",
          !member.active && "grayscale",
        )}
        style={{
          backgroundImage: member.bannerUrl
            ? `url("${member.bannerUrl}")`
            : // Without a banner the role colour fills the header.
              `linear-gradient(120deg, color-mix(in srgb, ${bannerColor} 65%, var(--popover)), color-mix(in srgb, ${bannerColor} 15%, var(--popover)))`,
        }}
      >
        {!member.active && (
          <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {t("common.memberProfile.leftServer")}
          </span>
        )}
      </div>

      <div className="px-4 pb-3.5">
        <div className="-mt-8 flex items-end justify-between">
          <MemberAvatar
            userId={member.userId}
            avatar={member.avatar}
            name={member.name}
            imageSize={160}
            className={cn(
              "size-16 ring-4 ring-popover",
              !member.active && "grayscale",
            )}
          />
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.memberProfile.copyMention")}
              title={t("common.memberProfile.copyMention")}
              onClick={() =>
                void copyValue(
                  `<@${member.userId}>`,
                  t("common.memberProfile.mentionCopied"),
                )
              }
            >
              <AtSign aria-hidden className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t("common.memberProfile.copyId")}
              title={t("common.memberProfile.copyId")}
              onClick={() =>
                void copyValue(
                  member.userId,
                  t("common.memberProfile.idCopied"),
                )
              }
            >
              <Hash aria-hidden className="size-4" />
            </Button>
          </div>
        </div>

        <p
          className="mt-2.5 text-lg leading-snug font-semibold break-words"
          style={roleColor ? { color: roleColor } : undefined}
        >
          {member.name}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {hasServerAvatar && (
            <MemberAvatar
              userId={member.userId}
              avatar={member.globalAvatar}
              name={displayName}
              className="size-4"
            />
          )}
          <span className="min-w-0 truncate">
            {displayName !== member.name && (
              <span className="text-foreground">{displayName}</span>
            )}
            {displayName !== member.name && member.username && " · "}
            {member.username && `@${member.username}`}
          </span>
        </p>

        <MemberProfileRoles roles={member.roles} />
      </div>

      {member.joinedAt && (
        <dl className="border-t px-4 py-3 text-xs">
          <dt className="text-muted-foreground">
            {t("common.memberProfile.joinedAt")}
          </dt>
          <dd className="mt-0.5 font-medium">
            {format(new Date(member.joinedAt), "dd.MM.yyyy")}
          </dd>
        </dl>
      )}

      <div className="border-t py-1">
        {links}
        {accessPolicy?.allows(Capability.LOOTLOG_LOOTS_READ) && (
          <MemberProfileLink
            icon={BarChart3}
            link={
              <Link
                to="/$guildId/stats/members/$memberId"
                params={memberParams}
              />
            }
          >
            {t("common.memberProfile.stats")}
          </MemberProfileLink>
        )}
        {accessPolicy?.allows(Capability.ADMIN) && (
          <MemberProfileLink
            icon={Settings2}
            link={
              <Link
                to="/$guildId/settings/members/$memberId"
                params={memberParams}
              />
            }
          >
            {t("common.memberProfile.settings")}
          </MemberProfileLink>
        )}
      </div>

      <div className="border-t p-3">
        <a
          href={`https://discord.com/users/${member.userId}`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: "sm", className: "w-full" })}
        >
          <ExternalLink aria-hidden className="size-4" />
          {t("common.memberProfile.openInDiscord")}
        </a>
      </div>
    </div>
  );
};
