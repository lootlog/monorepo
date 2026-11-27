import {
  buildReplayTimeline,
  getReplayStateAtTime,
  type ReplayLayout,
  type ReplayPacingMode,
  type ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import { toast } from "@lootlog/ui/lib/toast";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";
import { exportReplayToGif } from "./export-gif";
import { exportReplayToMp4 } from "./export-mp4";
import {
  getReplaySoundTriggerMs,
  scheduleReplayEventSound,
} from "./replay-audio";
import type { ReplaySpriteMap } from "./replay-canvas-types";
import {
  downloadReplayBlob,
  type ReplayExportFormat,
  type ReplayExportProgress,
} from "./replay-export-types";
import { buildReplayRenderLabels } from "./replay-render-labels";
import { renderFrame } from "./replay-renderer";
import { loadReplaySprites } from "./replay-sprite-loader";

export type ReplaySpeed = "0.5" | "1" | "2";

type ContentVisibilityEvent = Event & { readonly skipped: boolean };

type UseBattleReplayPlayerParams = {
  readonly battle: Battle;
  readonly rawBattle: RawBattle;
};

const EMPTY_SPRITES: ReplaySpriteMap = new Map();

const isContentVisibilityEvent = (
  event: Event,
): event is ContentVisibilityEvent => "skipped" in event;

const createLiveAudioContext = (): AudioContext | null => {
  const AudioContextCtor = globalThis.AudioContext;

  if (!AudioContextCtor) return null;

  try {
    return new AudioContextCtor();
  } catch {
    return null;
  }
};

export const useBattleReplayPlayer = ({
  battle,
  rawBattle,
}: UseBattleReplayPlayerParams) => {
  const { t } = useTranslation();

  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  const [layout, setLayout] = useState<ReplayLayout>("16:9");
  const [pacingMode, setPacingMode] = useState<ReplayPacingMode>("smart");
  const [speed, setSpeed] = useState<ReplaySpeed>("1");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const [exportFormat, setExportFormat] = useState<ReplayExportFormat | null>(
    null,
  );

  const [exportProgress, setExportProgress] =
    useState<ReplayExportProgress | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef(0);
  const isStageHiddenRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedEventIdsRef = useRef<Set<string>>(new Set());
  const exportAbortRef = useRef<AbortController | null>(null);

  const timeline: ReplayTimeline = buildReplayTimeline({
    characterId: battle.characterId,
    warriors: battle.warriors,
    moves: rawBattle.events,
    world: battle.world,
    battleType: battle.type,
    matchmaking: battle.matchmaking,
    winner: battle.winner,
    winningTeam: battle.winningTeam,
    hasFlee: battle.hasFlee,
    unfinished: battle.unfinished,
    pacingMode,
  });

  const spriteQuery = useQuery({
    queryKey: ["battle-replay-sprites", battle.id],
    queryFn: () => loadReplaySprites(timeline.participants),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const sprites = spriteQuery.data ?? EMPTY_SPRITES;
  const isLoadingSprites = spriteQuery.isPending;
  const renderLabels = buildReplayRenderLabels(t);
  const speedMultiplier = Number.parseFloat(speed);

  const paintCanvas = (timeMs: number) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    renderFrame(ctx, timeline, timeMs, layout, {
      sprites,
      labels: renderLabels,
      reducedMotion: prefersReducedMotion,
    });
  };

  const paintCanvasFromEffect = useEffectEvent(paintCanvas);

  const triggerLiveAudio = useEffectEvent((fromMs: number, toMs: number) => {
    if (!audioEnabled || toMs <= fromMs) return;

    const audioCtx = audioContextRef.current;

    if (!audioCtx || audioCtx.state !== "running") return;

    for (const event of timeline.events) {
      if (playedEventIdsRef.current.has(event.id)) continue;

      const triggerMs = getReplaySoundTriggerMs(event);

      if (triggerMs >= fromMs && triggerMs <= toMs) {
        playedEventIdsRef.current.add(event.id);
        scheduleReplayEventSound(
          audioCtx,
          audioCtx.destination,
          event,
          audioCtx.currentTime,
        );
      }
    }
  });

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- Keeps the imperative 2D canvas surface painted in sync with layout, pacing, sprite loading, motion preference, and scrubbed time.
  useEffect(() => {
    paintCanvasFromEffect(currentTimeRef.current);
  }, [layout, pacingMode, sprites, prefersReducedMotion, currentTimeMs]);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- Subscribes to document visibility and contentvisibilityautostatechange/IntersectionObserver to pause background canvas playback when hidden or off-screen.
  useEffect(() => {
    const stageEl = stageContainerRef.current;

    if (!stageEl) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isStageHiddenRef.current = true;
        setIsPlaying(false);
      } else {
        isStageHiddenRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const supportsContentVisibility =
      "contentVisibility" in document.documentElement.style;

    if (supportsContentVisibility) {
      const handleAutoStateChange = (rawEvent: Event) => {
        if (!isContentVisibilityEvent(rawEvent)) return;

        isStageHiddenRef.current = Boolean(rawEvent.skipped);

        if (rawEvent.skipped) setIsPlaying(false);
      };

      stageEl.addEventListener(
        "contentvisibilityautostatechange",
        handleAutoStateChange,
      );

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        stageEl.removeEventListener(
          "contentvisibilityautostatechange",
          handleAutoStateChange,
        );
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        isStageHiddenRef.current = !visible;

        if (!visible) setIsPlaying(false);
      },
      { rootMargin: "200px" },
    );

    observer.observe(stageEl);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- Drives the browser requestAnimationFrame playback clock while playing and cancels it on pause or unmount.
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastTick = performance.now();
    let lastUiSync = lastTick;

    const step = (now: number) => {
      if (isStageHiddenRef.current) return;

      const deltaMs = Math.min(80, now - lastTick) * speedMultiplier;
      lastTick = now;

      const previousTime = currentTimeRef.current;

      const nextTime = Math.min(
        timeline.totalDurationMs,
        previousTime + deltaMs,
      );

      currentTimeRef.current = nextTime;
      triggerLiveAudio(previousTime, nextTime);
      paintCanvasFromEffect(nextTime);

      if (now - lastUiSync >= 66 || nextTime >= timeline.totalDurationMs) {
        lastUiSync = now;
        setCurrentTimeMs(nextTime);
      }

      if (nextTime >= timeline.totalDurationMs) {
        setIsPlaying(false);

        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, speedMultiplier, timeline.totalDurationMs]);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- Releases the Web Audio context and aborts any in-flight video/GIF export when the replay studio unmounts.
  useEffect(
    () => () => {
      exportAbortRef.current?.abort();
      void audioContextRef.current?.close();
    },
    [],
  );

  const ensureAudioReady = () => {
    if (!audioEnabled) return;

    if (!audioContextRef.current) {
      audioContextRef.current = createLiveAudioContext();
    }

    if (audioContextRef.current?.state === "suspended") {
      void audioContextRef.current.resume();
    }
  };

  const seekTo = (nextTimeMs: number) => {
    const clamped = Math.max(0, Math.min(timeline.totalDurationMs, nextTimeMs));
    currentTimeRef.current = clamped;
    playedEventIdsRef.current.clear();
    setCurrentTimeMs(clamped);
    paintCanvas(clamped);
  };

  const togglePlay = () => {
    ensureAudioReady();

    if (isPlaying) {
      setIsPlaying(false);

      return;
    }

    if (currentTimeRef.current >= timeline.totalDurationMs - 16) {
      currentTimeRef.current = 0;
      playedEventIdsRef.current.clear();
      setCurrentTimeMs(0);
    }

    setIsPlaying(true);
  };

  const restart = () => {
    ensureAudioReady();
    currentTimeRef.current = 0;
    playedEventIdsRef.current.clear();
    setCurrentTimeMs(0);
    paintCanvas(0);
    setIsPlaying(true);
  };

  const stepTurn = (direction: -1 | 1) => {
    setIsPlaying(false);
    let currentSnapshotIndex = 0;

    for (let i = timeline.snapshots.length - 1; i >= 0; i -= 1) {
      const candidate = timeline.snapshots[i];

      if (candidate && candidate.timeMs <= currentTimeRef.current + 1) {
        currentSnapshotIndex = i;
        break;
      }
    }

    const nextIndex = Math.max(
      0,
      Math.min(timeline.snapshots.length - 1, currentSnapshotIndex + direction),
    );

    const targetSnapshot = timeline.snapshots[nextIndex];

    if (targetSnapshot) seekTo(targetSnapshot.timeMs);
  };

  const handlePacingChange = (nextPacing: ReplayPacingMode) => {
    setIsPlaying(false);
    setPacingMode(nextPacing);
    currentTimeRef.current = 0;
    playedEventIdsRef.current.clear();
    setCurrentTimeMs(0);
  };

  const cancelExport = () => {
    exportAbortRef.current?.abort();
  };

  const exportClip = async (format: ReplayExportFormat) => {
    if (exportFormat !== null) return;

    setIsPlaying(false);
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportFormat(format);
    setExportProgress({
      phase: "preparing",
      completedFrames: 0,
      totalFrames: 1,
      progress: 0,
    });

    const runExport = async () => {
      try {
        const exportParams = {
          battleId: battle.id,
          timeline,
          layout,
          renderOptions: {
            sprites,
            labels: renderLabels,
            reducedMotion: false,
          },
          includeAudio: audioEnabled,
          signal: controller.signal,
          onProgress: setExportProgress,
        };

        const result =
          format === "mp4"
            ? await exportReplayToMp4(exportParams)
            : await exportReplayToGif(exportParams);

        downloadReplayBlob(result);
        toast.success(
          t("battlePanel.single.replay.exportSuccess", {
            filename: result.filename,
          }),
          { duration: 3500 },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          toast.info(t("battlePanel.single.replay.exportCancelled"), {
            duration: 2500,
          });
        } else {
          toast.error(t("battlePanel.single.replay.exportError"));
        }
      }
    };

    await runExport();
    exportAbortRef.current = null;
    setExportFormat(null);
    setExportProgress(null);
  };

  const liveState = getReplayStateAtTime(timeline, currentTimeMs);

  return {
    canvasRef,
    stageContainerRef,
    timeline,
    layout,
    setLayout,
    pacingMode,
    handlePacingChange,
    speed,
    setSpeed,
    audioEnabled,
    setAudioEnabled,
    isPlaying,
    togglePlay,
    restart,
    stepTurn,
    seekTo,
    currentTimeMs,
    currentTurn: liveState.currentTurn,
    isLoadingSprites,
    exportFormat,
    exportProgress,
    exportClip,
    cancelExport,
  };
};
