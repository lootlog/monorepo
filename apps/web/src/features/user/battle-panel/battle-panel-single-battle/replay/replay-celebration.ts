import type {
  ReplayParticipant,
  ReplayVictoryEvent,
} from "@lootlog/battle-processor/replay-timeline";

export const SHEET_ROW = { south: 0, west: 1, east: 2, north: 3 } as const;

const TURN_FROM_BACK = [SHEET_ROW.north, SHEET_ROW.east, SHEET_ROW.south];

const SPIN_FROM_FRONT = [
  SHEET_ROW.south,
  SHEET_ROW.west,
  SHEET_ROW.north,
  SHEET_ROW.east,
  SHEET_ROW.south,
];

const CELEBRATION_DELAY_MS = 180;

const SLOT_STAGGER_MS = 90;

const TURN_STEP_MS = 110;

const HOP_PERIOD_MS = 440;

const HOP_HEIGHT = 7;

type Celebration = {
  readonly facingRow: number;
  readonly lift: number;
  readonly walkFrame: number;
};

export const isCelebrating = (
  participant: ReplayParticipant,
  victory: ReplayVictoryEvent | null,
  isDead: boolean,
) =>
  victory !== null &&
  victory.winningTeam !== null &&
  participant.team === victory.winningTeam &&
  !isDead;

export const getCelebration = (
  participant: ReplayParticipant,
  victory: ReplayVictoryEvent,
  timeMs: number,
  spriteScale: number,
  reducedMotion: boolean,
): Celebration | null => {
  const elapsed =
    timeMs -
    victory.tStart -
    CELEBRATION_DELAY_MS -
    participant.slotIndex * SLOT_STAGGER_MS;

  if (elapsed < 0) return null;

  const turn = participant.side === "left" ? TURN_FROM_BACK : SPIN_FROM_FRONT;
  const turnIndex = Math.floor(elapsed / TURN_STEP_MS);

  if (turnIndex < turn.length) {
    return {
      facingRow: turn[turnIndex] ?? SHEET_ROW.south,
      lift: 0,
      walkFrame: 0,
    };
  }

  if (reducedMotion) {
    return { facingRow: SHEET_ROW.south, lift: 0, walkFrame: 0 };
  }

  const hopTime = elapsed - turn.length * TURN_STEP_MS;
  const phase = (hopTime % HOP_PERIOD_MS) / HOP_PERIOD_MS;
  const lift = Math.sin(phase * Math.PI) * HOP_HEIGHT * spriteScale;

  return {
    facingRow: SHEET_ROW.south,
    lift,
    walkFrame: lift > spriteScale * 2 ? 1 : 0,
  };
};
