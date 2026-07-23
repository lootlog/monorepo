import type { ChatMessageResponseDtoOutput } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import type { NullableMemberResponseDto } from "@lootlog/api-client/models/main/nullable-member-response-dto";
import type { RoleResponseDtoOutput } from "@lootlog/api-client/models/main/role-response-dto-output";

const MENTION_BOUNDARY_PATTERN = /[\s.,!?;:()[\]{}"'`<>/\\|]/;

export type ChatMentionContext = {
  memberNames?: string[];
  roleNames?: string[];
  currentUserNames?: string[];
  currentUserRoleNames?: string[];
  memberColorsByName?: Record<string, string | null>;
  roleColorsByName?: Record<string, string | null>;
};

export type ChatMentionSegment = {
  text: string;
  isMention: boolean;
  isCurrentUserTarget: boolean;
  kind?: "member" | "role";
  color?: string | null;
  normalizedName?: string;
};

type MentionEntity = {
  name: string;
  normalizedName: string;
  isCurrentUserTarget: boolean;
  kind: "member" | "role";
  color: string | null;
};

type NamedMentionValue = {
  name?: string | null;
  color?: number | null;
};

export const normalizeChatMentionName = (value: string) => {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
};

export const getUniqueChatMentionNames = (values: string[]) => {
  const normalizedValues = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeChatMentionName(value);

    if (!normalizedValue || normalizedValues.has(normalizedValue)) {
      return false;
    }

    normalizedValues.add(normalizedValue);
    return true;
  });
};

export const isChatMentionBoundary = (value?: string) => {
  return value === undefined || MENTION_BOUNDARY_PATTERN.test(value);
};

export const getDiscordColorHex = (color?: number | null) => {
  if (color === undefined || color === null || color === 0) {
    return null;
  }

  return color.toString(16).padStart(6, "0");
};

const getNormalizedMentionColorsByName = <T extends NamedMentionValue>(
  values?: T[],
) => {
  return (values ?? []).reduce<Record<string, string | null>>(
    (result, value) => {
      const normalizedName = normalizeChatMentionName(value.name ?? "");

      if (!normalizedName || normalizedName in result) {
        return result;
      }

      result[normalizedName] = getDiscordColorHex(value.color);
      return result;
    },
    {},
  );
};

export const getChatMentionMemberColorsByName = (
  members?: MemberSummaryResponseDtoOutput[],
) => {
  return getNormalizedMentionColorsByName(members);
};

export const getChatMentionRoleColorsByName = (
  roles?: RoleResponseDtoOutput[],
) => {
  return getNormalizedMentionColorsByName(roles);
};

const getMentionEntities = (context?: ChatMentionContext): MentionEntity[] => {
  const entitiesByName = new Map<string, MentionEntity>();

  const upsertEntity = ({
    name,
    isCurrentUserTarget,
    kind,
    color,
  }: {
    name: string;
    isCurrentUserTarget: boolean;
    kind: "member" | "role";
    color: string | null;
  }) => {
    const normalizedName = normalizeChatMentionName(name);

    if (!normalizedName) {
      return;
    }

    const existingEntity = entitiesByName.get(normalizedName);

    if (existingEntity) {
      existingEntity.isCurrentUserTarget =
        existingEntity.isCurrentUserTarget || isCurrentUserTarget;
      existingEntity.color = existingEntity.color ?? color;
      return;
    }

    entitiesByName.set(normalizedName, {
      name,
      normalizedName,
      isCurrentUserTarget,
      kind,
      color,
    });
  };

  context?.memberNames?.forEach((name) =>
    upsertEntity({
      name,
      isCurrentUserTarget: false,
      kind: "member",
      color:
        context.memberColorsByName?.[normalizeChatMentionName(name)] ?? null,
    }),
  );
  context?.roleNames?.forEach((name) =>
    upsertEntity({
      name,
      isCurrentUserTarget: false,
      kind: "role",
      color: context.roleColorsByName?.[normalizeChatMentionName(name)] ?? null,
    }),
  );
  context?.currentUserNames?.forEach((name) =>
    upsertEntity({
      name,
      isCurrentUserTarget: true,
      kind: "member",
      color:
        context.memberColorsByName?.[normalizeChatMentionName(name)] ?? null,
    }),
  );
  context?.currentUserRoleNames?.forEach((name) =>
    upsertEntity({
      name,
      isCurrentUserTarget: true,
      kind: "role",
      color: context.roleColorsByName?.[normalizeChatMentionName(name)] ?? null,
    }),
  );

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

  if (index > 0 && !isChatMentionBoundary(previousCharacter)) {
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

    if (!isChatMentionBoundary(nextCharacter)) {
      continue;
    }

    return {
      end: mentionEnd,
      text: message.slice(index, mentionEnd),
      isCurrentUserTarget: entity.isCurrentUserTarget,
      kind: entity.kind,
      color: entity.color,
      normalizedName: entity.normalizedName,
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
        color: null,
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
        color: null,
      });
      break;
    }

    if (nextMentionIndex > cursor) {
      segments.push({
        text: message.slice(cursor, nextMentionIndex),
        isMention: false,
        isCurrentUserTarget: false,
        color: null,
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
        color: null,
      });
      cursor = nextMentionIndex + 1;
      continue;
    }

    segments.push({
      text: mentionMatch.text,
      isMention: true,
      isCurrentUserTarget: mentionMatch.isCurrentUserTarget,
      kind: mentionMatch.kind,
      color: mentionMatch.color,
      normalizedName: mentionMatch.normalizedName,
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
  return getUniqueChatMentionNames([
    ...(members?.map((member) => member.name) ?? []),
    ...(messages
      ?.map((message) => message.characterData?.nick)
      .filter((nick): nick is string => Boolean(nick)) ?? []),
  ]);
};

export const getChatMentionRoleNames = (roles?: RoleResponseDtoOutput[]) => {
  return getUniqueChatMentionNames((roles ?? []).map((role) => role.name));
};

export const getCurrentUserMentionNames = ({
  currentCharacterNick,
  currentMember,
}: {
  currentCharacterNick: string;
  currentMember?: NullableMemberResponseDto | null;
}) => {
  return getUniqueChatMentionNames([
    currentCharacterNick,
    currentMember?.name ?? "",
  ]);
};

export const getCurrentUserMentionRoleNames = (
  currentMember?: NullableMemberResponseDto | null,
) => {
  return getUniqueChatMentionNames(
    (currentMember?.roles ?? []).map((role) => role.name),
  );
};

export const buildChatMentionContext = ({
  currentCharacterNick,
  currentMember,
  members,
  messages,
  roles,
}: {
  currentCharacterNick: string;
  currentMember?: NullableMemberResponseDto | null;
  members?: MemberSummaryResponseDtoOutput[];
  messages?: ChatMessageResponseDtoOutput[];
  roles?: RoleResponseDtoOutput[];
}): ChatMentionContext => {
  const memberColorsByName = getChatMentionMemberColorsByName(members);
  const roleColorsByName = getChatMentionRoleColorsByName(roles);

  return {
    memberNames: getChatMentionMemberNames({ members, messages }),
    roleNames: getChatMentionRoleNames(roles),
    currentUserNames: getCurrentUserMentionNames({
      currentCharacterNick,
      currentMember,
    }),
    currentUserRoleNames: getCurrentUserMentionRoleNames(currentMember),
    memberColorsByName,
    roleColorsByName,
  };
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
