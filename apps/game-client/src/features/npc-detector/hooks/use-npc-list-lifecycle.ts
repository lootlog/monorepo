import type {
  GameNpcWithLocation,
  NpcDetectorState,
} from "@/store/npc-detector.store";
import { useEffect, useRef } from "react";

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

/**
 * Expires notification cooldowns and detection animations with one timer
 * armed for the nearest deadline. Nothing here re-renders the list while a
 * cooldown runs; the store updates on expiry are the only React-visible
 * changes.
 */
export const useNpcListLifecycle = ({
  activeDetectionAnimations,
  clearDetectionAnimation,
  npcs,
  setNpcStates,
}: UseNpcListLifecycleOptions) => {
  const detectionDeadlineByNpcIdRef = useRef(
    new Map<number, DetectionAnimationDeadline>(),
  );

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

  // The timer expires external detector-store cooldowns; these are not derived parent props.
  // oxlint-disable-next-line react-doctor/no-pass-data-to-parent, react-doctor/no-pass-live-state-to-parent
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNearestExpiry = (now: number) => {
      let nearestDeadline = Infinity;

      for (const npc of npcs) {
        if (npc.notificationSentAt === null) continue;
        const deadline = npc.notificationSentAt + NPC_NOTIFICATION_COOLDOWN_MS;

        if (deadline > now)
          nearestDeadline = Math.min(nearestDeadline, deadline);
      }

      detectionDeadlineByNpcIdRef.current.forEach(({ endsAt }) => {
        if (endsAt > now) nearestDeadline = Math.min(nearestDeadline, endsAt);
      });

      if (nearestDeadline === Infinity) return;

      timeoutId = window.setTimeout(expireDue, nearestDeadline - now);
    };

    const expireDue = () => {
      timeoutId = undefined;
      const now = Date.now();

      const expiredCooldownNpcIds = npcs.flatMap((npc) =>
        npc.notificationSentAt !== null &&
        npc.notificationSentAt + NPC_NOTIFICATION_COOLDOWN_MS <= now
          ? [npc.id]
          : [],
      );

      if (expiredCooldownNpcIds.length > 0) {
        setNpcStates(
          expiredCooldownNpcIds.map((npcId) => ({
            npcId,
            npc: { notificationSentAt: null },
          })),
        );
      }

      detectionDeadlineByNpcIdRef.current.forEach(
        ({ cycle, endsAt }, npcId) => {
          if (endsAt <= now) {
            clearDetectionAnimation(npcId, cycle);
            detectionDeadlineByNpcIdRef.current.delete(npcId);
          }
        },
      );

      scheduleNearestExpiry(now);
    };

    expireDue();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [activeDetectionAnimations, clearDetectionAnimation, npcs, setNpcStates]);
};
