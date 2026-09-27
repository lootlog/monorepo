import type { BattlePingType } from "@lootlog/schema/battle-ping";
import { getPingPresentation } from "./ping-presentation";

export type BattlePingMark = {
  /** The history entry this mark shows. */
  entryId: number;
  /** True when an ally asked the local hero for this. */
  forMe: boolean;
  senderName: string;
  type: BattlePingType;
  expiresAt: number;
};

export type BattlePingTarget = {
  /** The history entry this target shows. */
  entryId: number;
  /** `performance.now()` time the target was picked. */
  receivedAt: number;
  senderName: string;
  warriorId: number;
};

/** One ping of the current fight, kept after its mark leaves the warrior. */
export type BattlePingEntry = {
  id: number;
  forMe: boolean;
  /** `performance.now()` time the ping arrived or was sent. */
  receivedAt: number;
  senderName: string;
  type: BattlePingType;
  warriorId: number;
};

export type BattlePingSnapshot = {
  marks: ReadonlyMap<number, BattlePingMark>;
  /** The team's shared attack target; the latest `attack` ping wins. */
  target: BattlePingTarget | null;
  /** The fight's pings, newest first. */
  history: readonly BattlePingEntry[];
  /**
   * The fight has had a ping, even one retracted since; only the battle's end
   * resets it.
   */
  fightPinged: boolean;
  /** The warrior a history entry under the pointer refers to. */
  highlightedWarriorId: number | null;
};

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

type StoreDependencies = {
  clearTimer: (timer: TimerHandle) => void;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
};

const EMPTY_SNAPSHOT: BattlePingSnapshot = {
  marks: new Map(),
  target: null,
  history: [],
  fightPinged: false,
  highlightedWarriorId: null,
};

/** A long fight keeps its recent pings; older ones no longer matter. */
const HISTORY_LIMIT = 20;

const defaultDependencies: StoreDependencies = {
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  now: () => performance.now(),
  setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
};

/**
 * Battle pings for the current fight. Marks expire on their own; the shared
 * target stays until it is replaced, its warrior dies, or the battle ends.
 * The history keeps the fight's latest pings until the battle ends.
 */
export class BattlePingStore {
  private readonly dependencies: StoreDependencies;
  private readonly listeners = new Set<() => void>();
  private snapshot = EMPTY_SNAPSHOT;
  private expiryTimer: TimerHandle | null = null;
  private nextEntryId = 1;

  constructor(dependencies: Partial<StoreDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  /** Shows a ping and returns its history entry id. */
  apply(input: {
    forMe: boolean;
    senderName: string;
    type: BattlePingType;
    warriorId: number;
  }): number {
    const now = this.dependencies.now();
    const entryId = this.nextEntryId++;

    const history = [
      { ...input, id: entryId, receivedAt: now },
      ...this.snapshot.history,
    ].slice(0, HISTORY_LIMIT);

    const marks = new Map(this.snapshot.marks);

    if (input.type === "attack") {
      marks.delete(input.warriorId);
      this.setSnapshot({
        ...this.snapshot,
        fightPinged: true,
        history,
        marks,
        target: {
          entryId,
          receivedAt: now,
          senderName: input.senderName,
          warriorId: input.warriorId,
        },
      });

      return entryId;
    }

    marks.set(input.warriorId, {
      entryId,
      expiresAt: now + getPingPresentation(input.type).durationMs,
      forMe: input.forMe,
      senderName: input.senderName,
      type: input.type,
    });
    this.setSnapshot({ ...this.snapshot, fightPinged: true, history, marks });

    return entryId;
  }

  /**
   * Undoes a local ping the gateway rejected: the team never saw it, so it
   * leaves the history, and its mark or target unless another ping already
   * replaced it.
   */
  retract(entryId: number, previousTarget: BattlePingTarget | null): void {
    const { history, marks, target } = this.snapshot;
    const nextHistory = history.filter(({ id }) => id !== entryId);
    const nextMarks = new Map(marks);

    for (const [warriorId, mark] of marks) {
      if (mark.entryId === entryId) {
        nextMarks.delete(warriorId);
      }
    }

    const nextTarget = target?.entryId === entryId ? previousTarget : target;

    if (
      nextHistory.length === history.length &&
      nextMarks.size === marks.size &&
      nextTarget === target
    ) {
      return;
    }

    this.setSnapshot({
      ...this.snapshot,
      history: nextHistory,
      marks: nextMarks,
      target: nextTarget,
    });
  }

  /**
   * Drops the mark and target shown on a warrior, e.g. once it died. Its
   * history entries stay.
   */
  removeWarrior(warriorId: number): void {
    const { marks, target } = this.snapshot;

    if (!marks.has(warriorId) && target?.warriorId !== warriorId) {
      return;
    }

    const nextMarks = new Map(marks);
    nextMarks.delete(warriorId);
    this.setSnapshot({
      ...this.snapshot,
      marks: nextMarks,
      target: target?.warriorId === warriorId ? null : target,
    });
  }

  /** Points at the warrior of the history entry under the pointer. */
  highlightWarrior(warriorId: number | null): void {
    if (this.snapshot.highlightedWarriorId === warriorId) {
      return;
    }

    this.setSnapshot({ ...this.snapshot, highlightedWarriorId: warriorId });
  }

  clear(): void {
    if (this.snapshot === EMPTY_SNAPSHOT) {
      return;
    }

    this.setSnapshot(EMPTY_SNAPSHOT);
  }

  readonly getSnapshot = (): BattlePingSnapshot => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  private pruneExpired(): void {
    const now = this.dependencies.now();
    const marks = new Map(this.snapshot.marks);

    for (const [warriorId, mark] of marks) {
      if (mark.expiresAt <= now) {
        marks.delete(warriorId);
      }
    }

    if (marks.size !== this.snapshot.marks.size) {
      this.setSnapshot({ ...this.snapshot, marks });

      return;
    }

    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) {
      this.dependencies.clearTimer(this.expiryTimer);
      this.expiryTimer = null;
    }

    if (this.snapshot.marks.size === 0) {
      return;
    }

    const nextExpiry = Math.min(
      ...[...this.snapshot.marks.values()].map((mark) => mark.expiresAt),
    );

    this.expiryTimer = this.dependencies.setTimer(
      () => {
        this.expiryTimer = null;
        this.pruneExpired();
      },
      Math.max(0, nextExpiry - this.dependencies.now()),
    );
  }

  private setSnapshot(snapshot: BattlePingSnapshot): void {
    this.snapshot = snapshot;
    this.scheduleExpiry();

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const battlePingStore = new BattlePingStore();
