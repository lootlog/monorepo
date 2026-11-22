import type { BattlePingType } from "@lootlog/schema/battle-ping";
import { getPingPresentation } from "./ping-presentation";

export type BattlePingMark = {
  entryId: number;
  forMe: boolean;
  senderName: string;
  type: BattlePingType;
  expiresAt: number;
};

export type BattlePingTarget = {
  entryId: number;
  receivedAt: number;
  senderName: string;
  warriorId: number;
};

type BattlePingEntry = {
  id: number;
  forMe: boolean;
  receivedAt: number;
  senderName: string;
  type: BattlePingType;
  warriorId: number;
};

type BattlePingSnapshot = {
  marks: ReadonlyMap<number, BattlePingMark>;
  target: BattlePingTarget | null;
  history: readonly BattlePingEntry[];
  fightPinged: boolean;
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

const HISTORY_LIMIT = 20;

const defaultDependencies: StoreDependencies = {
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  now: () => performance.now(),
  setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
};

class BattlePingStore {
  private readonly dependencies: StoreDependencies;
  private readonly listeners = new Set<() => void>();
  private snapshot = EMPTY_SNAPSHOT;
  private expiryTimer: TimerHandle | null = null;
  private nextEntryId = 1;

  constructor(dependencies: Partial<StoreDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

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
