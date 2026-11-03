import type {
  HeroSightingMemberDto,
  HeroSightingResponseDtoDetectorCharacter,
} from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { cn } from "cn";
import { MemberAvatar } from "@/components/common/member-avatar";
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
}: HeroSightingMemberProps) => (
  <span className={cn("flex min-w-0 items-center gap-2", className)}>
    <MemberAvatar
      avatarUrl={member.avatarUrl}
      name={member.displayName}
      className={cn("size-7", highlighted && DETECTOR_AVATAR_CLASS)}
    />
    <span className="flex min-w-0 flex-col leading-tight">
      <span
        className={cn(
          "truncate text-sm",
          highlighted ? DETECTOR_NAME_CLASS : "font-medium",
        )}
      >
        {member.displayName}
      </span>
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
