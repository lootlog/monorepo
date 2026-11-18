import { InactiveMemberSuffix } from "@/components/common/inactive-member-suffix";
import { MemberAvatar } from "@/components/common/member-avatar";
import { MemberProfileCard } from "@/components/common/member-profile-card";
import {
  findGuildMember,
  useGuildMemberDirectory,
  type GuildMemberKey,
} from "@/hooks/api/use-guild-member-map";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { discordRoleCssColor } from "@lootlog/domain/member-display-role";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type MemberIdentityProps = {
  /** The key the record stores for its member. */
  member: GuildMemberKey | undefined;
  /**
   * What the record itself knows, shown until the member list loads and for
   * someone the Organization no longer lists.
   */
  fallback: { name: string; avatarUrl?: string | null };
  display?: "full" | "name" | "avatar";
  /**
   * False where the surrounding page or tile already is this member, or where
   * the member sits inside another button.
   */
  interactive?: boolean;
  /** `MemberProfileLink` rows for the page the name used to lead to. */
  profileLinks?: React.ReactNode;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
};

/**
 * A member of the Organization, shown the same way everywhere: avatar, server
 * nickname in the role's colour, and their profile card on click.
 */
export const MemberIdentity = ({
  member: memberKey,
  fallback,
  display = "full",
  interactive = true,
  profileLinks,
  className,
  avatarClassName,
  nameClassName,
}: MemberIdentityProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const directory = useGuildMemberDirectory(guildId);
  const member = memberKey ? findGuildMember(directory, memberKey) : undefined;

  const name = member?.name ?? fallback.name;
  const color = discordRoleCssColor(member?.color);
  const avatarSize = cn("size-5", avatarClassName);

  const content = (
    <>
      {display !== "name" &&
        (member ? (
          <MemberAvatar
            userId={member.userId}
            avatar={member.avatar}
            name={name}
            className={avatarSize}
          />
        ) : (
          <MemberAvatar
            avatarUrl={fallback.avatarUrl ?? null}
            name={name}
            className={avatarSize}
          />
        ))}
      {display !== "avatar" && (
        <span
          className={cn(
            "min-w-0 truncate text-sm font-medium",
            // The underline takes the colour of the name, not of the button.
            interactive && "group-hover/member:underline",
            nameClassName,
          )}
          style={color ? { color } : undefined}
        >
          {name}
          {member?.active === false && <InactiveMemberSuffix />}
        </span>
      )}
    </>
  );

  const layout = cn(
    "inline-flex max-w-full min-w-0 items-center gap-1.5 align-middle",
    className,
  );

  if (!interactive || !member || !guildId)
    return <span className={layout}>{content}</span>;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={display === "avatar" ? name : undefined}
            className={cn(
              layout,
              // Stays clickable inside a row whose content lets clicks through
              // to a link stretched under it.
              "pointer-events-auto cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
              display === "avatar"
                ? "rounded-full hover:brightness-110"
                : "group/member rounded-sm",
            )}
            // A member inside a clickable row opens only their own profile.
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        {content}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        aria-label={t("common.memberProfile.label", { name })}
        className="w-[320px] max-w-[calc(100vw-1rem)] overflow-hidden p-0"
      >
        <MemberProfileCard
          member={member}
          guildId={guildId}
          links={profileLinks}
        />
      </PopoverContent>
    </Popover>
  );
};
