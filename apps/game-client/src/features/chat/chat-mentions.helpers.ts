import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  NullableMemberResponseDto,
  RoleResponseDtoOutput,
} from "@/lib/api/generated/main/model";

const MENTION_BOUNDARY_PATTERN = /[\s.,!?;:()[\]{}"'`<>/\\|]/;

export type ChatMentionContext = {
  memberNames?: string[];
  roleNames?: string[];
  currentUserNames?: string[];
  currentUserRoleNames?: string[];
};

export type ChatMentionSegment = {
  text: string;
  isMention: boolean;
  isCurrentUserTarget: boolean;
};

type MentionEntity = {
  name: string;
  normalizedName: string;
  isCurrentUserTarget: boolean;
};

const normalizeMentionName = (value: string) => {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
};

const getUniqueMentionNames = (values: string[]) => {
  const normalizedValues = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeMentionName(value);

    if (!normalizedValue || normalizedValues.has(normalizedValue)) {
      return false;
    }

    normalizedValues.add(normalizedValue);
    return true;
  });
};

const isMentionBoundary = (value?: string) => {
  return value === undefined || MENTION_BOUNDARY_PATTERN.test(value);
};

const getMentionEntities = (context?: ChatMentionContext): MentionEntity[] => {
  const entitiesByName = new Map<string, MentionEntity>();

  const upsertEntity = (name: string, isCurrentUserTarget: boolean) => {
    const normalizedName = normalizeMentionName(name);

    if (!normalizedName) {
      return;
    }

    const existingEntity = entitiesByName.get(normalizedName);

    if (existingEntity) {
      existingEntity.isCurrentUserTarget =
        existingEntity.isCurrentUserTarget || isCurrentUserTarget;
      return;
    }

    entitiesByName.set(normalizedName, {
      name,
      normalizedName,
      isCurrentUserTarget,
    });
  };

  context?.memberNames?.forEach((name) => upsertEntity(name, false));
  context?.roleNames?.forEach((name) => upsertEntity(name, false));
  context?.currentUserNames?.forEach((name) => upsertEntity(name, true));
  context?.currentUserRoleNames?.forEach((name) => upsertEntity(name, true));

  return [...entitiesByName.values()].sort((left, right) => {
    return right.name.length - left.name.length;
  });
};

const matchMentionAt = ({
  message,
  lowerCaseMessage,
  index,
  entities,
}: {
  message: string;
  lowerCaseMessage: string;
  index: number;
  entities: MentionEntity[];
}) => {
  if (message[index] !== "@") {
    return null;
  }

  const previousCharacter = message[index - 1];

  if (index > 0 && !isMentionBoundary(previousCharacter)) {
    return null;
  }

  for (const entity of entities) {
    const mentionStart = index + 1;
    const mentionEnd = mentionStart + entity.name.length;
    const slice = lowerCaseMessage.slice(mentionStart, mentionEnd);

    if (slice !== entity.normalizedName) {
      continue;
    }

    const nextCharacter = message[mentionEnd];

    if (!isMentionBoundary(nextCharacter)) {
      continue;
    }

    return {
      end: mentionEnd,
      text: message.slice(index, mentionEnd),
      isCurrentUserTarget: entity.isCurrentUserTarget,
    };
  }

  return null;
};

export const hasChatMentionToken = (message: string) => {
  return message.includes("@");
};

export const getChatMentionSegments = (
  message: string,
  context?: ChatMentionContext,
): ChatMentionSegment[] => {
  const mentionEntities = getMentionEntities(context);

  if (!hasChatMentionToken(message) || mentionEntities.length === 0) {
    return [
      {
        text: message,
        isMention: false,
        isCurrentUserTarget: false,
      },
    ];
  }

  const lowerCaseMessage = message.toLocaleLowerCase();
  const segments: ChatMentionSegment[] = [];
  let cursor = 0;

  while (cursor < message.length) {
    const nextMentionIndex = message.indexOf("@", cursor);

    if (nextMentionIndex === -1) {
      segments.push({
        text: message.slice(cursor),
        isMention: false,
        isCurrentUserTarget: false,
      });
      break;
    }

    if (nextMentionIndex > cursor) {
      segments.push({
        text: message.slice(cursor, nextMentionIndex),
        isMention: false,
        isCurrentUserTarget: false,
      });
    }

    const mentionMatch = matchMentionAt({
      message,
      lowerCaseMessage,
      index: nextMentionIndex,
      entities: mentionEntities,
    });

    if (!mentionMatch) {
      segments.push({
        text: message[nextMentionIndex] ?? "",
        isMention: false,
        isCurrentUserTarget: false,
      });
      cursor = nextMentionIndex + 1;
      continue;
    }

    segments.push({
      text: mentionMatch.text,
      isMention: true,
      isCurrentUserTarget: mentionMatch.isCurrentUserTarget,
    });
    cursor = mentionMatch.end;
  }

  return segments.filter((segment) => segment.text.length > 0);
};

export const hasCurrentUserMention = (
  message: string,
  context?: Pick<
    ChatMentionContext,
    "currentUserNames" | "currentUserRoleNames"
  >,
) => {
  return getChatMentionSegments(message, context).some((segment) => {
    return segment.isMention && segment.isCurrentUserTarget;
  });
};

export const getChatMentionMemberNames = ({
  members,
  messages,
}: {
  members?: MemberSummaryResponseDtoOutput[];
  messages?: ChatMessageResponseDtoOutput[];
}) => {
  return getUniqueMentionNames([
    ...(members?.map((member) => member.name) ?? []),
    ...(messages
      ?.map((message) => message.characterData?.nick)
      .filter((nick): nick is string => Boolean(nick)) ?? []),
  ]);
};

export const getChatMentionRoleNames = (roles?: RoleResponseDtoOutput[]) => {
  return getUniqueMentionNames((roles ?? []).map((role) => role.name));
};

export const getCurrentUserMentionNames = ({
  currentCharacterNick,
  currentMember,
}: {
  currentCharacterNick: string;
  currentMember?: NullableMemberResponseDto | null;
}) => {
  return getUniqueMentionNames([
    currentCharacterNick,
    currentMember?.name ?? "",
  ]);
};

export const getCurrentUserMentionRoleNames = (
  currentMember?: NullableMemberResponseDto | null,
) => {
  return getUniqueMentionNames(
    (currentMember?.roles ?? []).map((role) => role.name),
  );
};

export const getChatMentionNotificationId = ({
  guildId,
  messageId,
}: {
  guildId: string;
  messageId: string;
}) => {
  return `chat-mention:${guildId}:${messageId}`;
};
