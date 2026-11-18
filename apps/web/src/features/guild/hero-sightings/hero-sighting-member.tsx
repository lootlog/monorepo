import type {
  HeroSightingMemberDto,
  HeroSightingResponseDtoDetectorCharacter,
} from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { cn } from "cn";
import { MemberIdentity } from "@/components/common/member-identity";
import {
  DETECTOR_AVATAR_CLASS,
  DETECTOR_NAME_CLASS,
} from "./hero-sighting-detector-highlight";

type HeroSightingMemberProps = {
  member: HeroSightingMemberDto;
  character?: HeroSightingResponseDtoDetectorCharacter;
  /** The detector: their name stands out from the members around it. */
  highlighted?: boolean;
  className?: string;
};

/** A member by Discord name and avatar, with the character they played. */
export const HeroSightingMember = ({
  member,
  character,
  highlighted = false,
  className,
}: HeroSightingMemberProps) => {
  const memberKey = { memberId: member.memberId };
  const fallback = { name: member.displayName, avatarUrl: member.avatarUrl };

  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <MemberIdentity
        member={memberKey}
        fallback={fallback}
        display="avatar"
        className="shrink-0"
        avatarClassName={cn("size-7", highlighted && DETECTOR_AVATAR_CLASS)}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <MemberIdentity
          member={memberKey}
          fallback={fallback}
          display="name"
          className="self-start"
          nameClassName={highlighted ? DETECTOR_NAME_CLASS : undefined}
        />
        {character && (
          <span className="truncate text-xs text-muted-foreground">
            {character.lvl === null
              ? character.name
              : `${character.name} (${formatLevel(character.lvl, character.prof)})`}
          </span>
        )}
      </span>
    </span>
  );
};
