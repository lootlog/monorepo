import type { RealtimeAccessPolicyObserver } from "@/contexts/socket-context";
import { airTagGameEventObserver } from "@/features/air-tags/air-tag-game-event-observer";
import { chatAccessPolicyObserver } from "@/features/chat/chat-access-policy";
import { notificationAccessPolicyObserver } from "@/features/notifications/notification-access-policy";
import { pingGameEventObserver } from "@/features/pings/ping-game-event-observer";
import type { GameEventObserver } from "@/processors/game-event-observer";

export const gameEventObservers: readonly GameEventObserver[] = [
  pingGameEventObserver,
  airTagGameEventObserver,
];

export const realtimeAccessPolicyObservers: readonly RealtimeAccessPolicyObserver[] =
  [chatAccessPolicyObserver, notificationAccessPolicyObserver];
