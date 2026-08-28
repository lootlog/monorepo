import type {
  GameNpcWithLocation,
  NpcDetectorState,
} from "@/store/npc-detector.store";
import { useEffect, useRef, useState } from "react";
import { useNpcDetectorClock } from "./use-npc-detector-clock";

export const NPC_NOTIFICATION_COOLDOWN_MS = 5000;
export const NPC_DETECTION_ANIMATION_DURATION_MS = 1050;

type UseNpcListLifecycleOptions = {
  activeDetectionAnimations: Record<number, number>;
  clearDetectionAnimation: NpcDetectorState["clearDetectionAnimation"];
  npcs: GameNpcWithLocation[];
  setNpcStates: NpcDetectorState["setNpcStates"];
};

type DetectionAnimationDeadline = {
  cycle: number;
  endsAt: number;
};

export const useNpcListLifecycle = ({
  activeDetectionAnimations,
  clearDetectionAnimation,
  npcs,
  setNpcStates,
}: UseNpcListLifecycleOptions) => {
  const detectionDeadlineByNpcIdRef = useRef(
    new Map<number, DetectionAnimationDeadline>(),
  );
  const hasNotificationCooldown = npcs.some((npc) => npc.notificationSent);
  const hasDetectionAnimation =
    Object.keys(activeDetectionAnimations).length > 0;
  const currentTimeMs = useNpcDetectorClock(
    hasNotificationCooldown || hasDetectionAnimation,
  );
  const notificationNpcSignature = npcs
    .filter((npc) => npc.notificationSent)
    .map((npc) => npc.id)
    .join(":");
  const [notificationDeadlineState, setNotificationDeadlineState] = useState(
    () => ({
      deadlines: new Map<number, number>(),
      signature: "",
    }),
  );
  let notificationDeadlineByNpcId = notificationDeadlineState.deadlines;
  if (notificationDeadlineState.signature !== notificationNpcSignature) {
    const nextDeadlines = new Map<number, number>();
    for (const npc of npcs) {
      if (!npc.notificationSent) continue;
      nextDeadlines.set(
        npc.id,
        notificationDeadlineState.deadlines.get(npc.id) ??
          currentTimeMs + NPC_NOTIFICATION_COOLDOWN_MS,
      );
    }
    notificationDeadlineByNpcId = nextDeadlines;
    setNotificationDeadlineState({
      deadlines: nextDeadlines,
      signature: notificationNpcSignature,
    });
  }

  useEffect(() => {
    const activeNpcIds = new Set(npcs.map((npc) => npc.id));

    for (const npcId of detectionDeadlineByNpcIdRef.current.keys()) {
      if (!activeNpcIds.has(npcId)) {
        detectionDeadlineByNpcIdRef.current.delete(npcId);
      }
    }
  }, [npcs]);

  useEffect(() => {
    const now = Date.now();
    const activeNpcIds = new Set<number>();

    for (const [npcIdText, cycle] of Object.entries(
      activeDetectionAnimations,
    )) {
      const npcId = Number(npcIdText);
      activeNpcIds.add(npcId);
      const currentDeadline = detectionDeadlineByNpcIdRef.current.get(npcId);

      if (currentDeadline?.cycle === cycle) continue;

      detectionDeadlineByNpcIdRef.current.set(npcId, {
        cycle,
        endsAt: now + NPC_DETECTION_ANIMATION_DURATION_MS,
      });
    }

    for (const npcId of detectionDeadlineByNpcIdRef.current.keys()) {
      if (!activeNpcIds.has(npcId)) {
        detectionDeadlineByNpcIdRef.current.delete(npcId);
      }
    }
  }, [activeDetectionAnimations]);

  useEffect(() => {
    const expiredCooldownNpcIds: number[] = [];

    notificationDeadlineByNpcId.forEach((deadline, npcId) => {
      if (deadline <= currentTimeMs) {
        expiredCooldownNpcIds.push(npcId);
      }
    });

    if (expiredCooldownNpcIds.length > 0) {
      setNpcStates(
        expiredCooldownNpcIds.map((npcId) => ({
          npcId,
          npc: { notificationSent: false },
        })),
      );
    }

    detectionDeadlineByNpcIdRef.current.forEach(({ cycle, endsAt }, npcId) => {
      if (endsAt <= currentTimeMs) {
        clearDetectionAnimation(npcId, cycle);
        detectionDeadlineByNpcIdRef.current.delete(npcId);
      }
    });
  }, [
    clearDetectionAnimation,
    currentTimeMs,
    notificationDeadlineByNpcId,
    setNpcStates,
  ]);

  return {
    currentTimeMs,
    notificationDeadlineByNpcId,
  };
};
