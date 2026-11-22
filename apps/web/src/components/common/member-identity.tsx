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
  member: GuildMemberKey | undefined;
  fallback: { name: string; avatarUrl?: string | null };
  display?: "full" | "name" | "avatar";
  interactive?: boolean;
  profileLinks?: React.ReactNode;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
};

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
              "pointer-events-auto cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
              display === "avatar"
                ? "rounded-full hover:brightness-110"
                : "group/member rounded-sm",
            )}
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
