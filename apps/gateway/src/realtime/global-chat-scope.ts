import type { SubscriptionScope } from "@lootlog/protocol/realtime";

export const globalChatScope = (
  world: string | undefined,
): SubscriptionScope =>
  world === undefined
    ? { topic: "global.chat" }
    : { topic: "global.chat.world", world };

export const isGlobalChatTopic = (topic: SubscriptionScope["topic"]): boolean =>
  topic === "global.chat" || topic === "global.chat.world";
