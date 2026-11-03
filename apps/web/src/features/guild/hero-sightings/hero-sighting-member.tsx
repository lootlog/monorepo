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
  /** Leads the name, such as "Wykrył", so a reader knows the member's part. */
  label?: string;
  /** The detector: their name stands out from the members around it. */
  highlighted?: boolean;
  className?: string;
};

/** A member by Discord name and avatar, with the character they played. */
export const HeroSightingMember = ({
  member,
  character,
  label,
  highlighted = false,
  className,
}: HeroSightingMemberProps) => (
  <span className={cn("flex min-w-0 items-center gap-2", className)}>
    <MemberAvatar
      avatarUrl={member.avatarUrl}
      name={member.displayName}
      className={cn("size-6", highlighted && DETECTOR_AVATAR_CLASS)}
    />
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-sm">
        {label && <span className="text-muted-foreground">{`${label}: `}</span>}
        <span className={highlighted ? DETECTOR_NAME_CLASS : "font-medium"}>
          {member.displayName}
        </span>
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
