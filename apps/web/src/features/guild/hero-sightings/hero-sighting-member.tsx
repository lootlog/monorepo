import type {
  HeroSightingMemberDto,
  HeroSightingResponseDtoDetectorCharacter,
} from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { cn } from "cn";
import { MemberIdentity } from "@/components/common/member-identity";

type HeroSightingMemberProps = {
  member: HeroSightingMemberDto;
  character?: HeroSightingResponseDtoDetectorCharacter;
  className?: string;
};

/** A member by Discord name, with the character they played. */
export const HeroSightingMember = ({
  member,
  character,
  className,
}: HeroSightingMemberProps) => (
  <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
    <MemberIdentity
      member={{ memberId: member.memberId }}
      fallback={{ name: member.displayName, avatarUrl: member.avatarUrl }}
      display="name"
      className="self-start"
    />
    {character && (
      <span className="truncate text-xs text-muted-foreground">
        {character.lvl === null
          ? character.name
          : `${character.name} (${formatLevel(character.lvl, character.prof)})`}
      </span>
    )}
  </span>
);
