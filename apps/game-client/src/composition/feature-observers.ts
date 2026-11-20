import type { RealtimeAccessPolicyObserver } from "@/contexts/socket-context";
import { airTagGameEventObserver } from "@/features/air-tags/air-tag-game-event-observer";
import { chatAccessPolicyObserver } from "@/features/chat/chat-access-policy";
import { notificationAccessPolicyObserver } from "@/features/notifications/notification-access-policy";
import { pingGameEventObserver } from "@/features/pings/ping-game-event-observer";
import type { GameEventObserver } from "@/processors/game-event-observer";

/** Features that react to game facts, in the order they run. */
export const gameEventObservers: readonly GameEventObserver[] = [
  pingGameEventObserver,
  airTagGameEventObserver,
];

/** Feature caches that follow the Organization access policy. */
export const realtimeAccessPolicyObservers: readonly RealtimeAccessPolicyObserver[] =
  [chatAccessPolicyObserver, notificationAccessPolicyObserver];
