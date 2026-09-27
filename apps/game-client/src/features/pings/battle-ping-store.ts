import type { BattlePingType } from "@lootlog/schema/battle-ping";
import { getPingPresentation } from "./ping-presentation";

export type BattlePingMark = {
  /** True when an ally asked the local hero for this. */
  forMe: boolean;
  senderName: string;
  type: BattlePingType;
  expiresAt: number;
};

export type BattlePingTarget = {
  senderName: string;
  warriorId: number;
};

export type BattlePingSnapshot = {
  marks: ReadonlyMap<number, BattlePingMark>;
  /** The team's shared attack target; the latest `attack` ping wins. */
  target: BattlePingTarget | null;
};

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

type StoreDependencies = {
  clearTimer: (timer: TimerHandle) => void;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
};

const EMPTY_SNAPSHOT: BattlePingSnapshot = { marks: new Map(), target: null };

const defaultDependencies: StoreDependencies = {
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  now: () => performance.now(),
  setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
};

/**
 * Battle pings for the current fight. Marks expire on their own; the shared
 * target stays until it is replaced, its warrior dies, or the battle ends.
 */
export class BattlePingStore {
  private readonly dependencies: StoreDependencies;
  private readonly listeners = new Set<() => void>();
  private snapshot = EMPTY_SNAPSHOT;
  private expiryTimer: TimerHandle | null = null;

  constructor(dependencies: Partial<StoreDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  apply(input: {
    forMe: boolean;
    senderName: string;
    type: BattlePingType;
    warriorId: number;
  }): void {
    if (input.type === "attack") {
      const marks = new Map(this.snapshot.marks);
      marks.delete(input.warriorId);
      this.setSnapshot({
        marks,
        target: { senderName: input.senderName, warriorId: input.warriorId },
      });

      return;
    }

    const marks = new Map(this.snapshot.marks);
    marks.set(input.warriorId, {
      expiresAt:
        this.dependencies.now() + getPingPresentation(input.type).durationMs,
      forMe: input.forMe,
      senderName: input.senderName,
      type: input.type,
    });
    this.setSnapshot({ ...this.snapshot, marks });
  }

  /**
   * Undoes a local ping the gateway rejected, unless another ping already
   * replaced it.
   */
  retract(
    input: { senderName: string; type: BattlePingType; warriorId: number },
    previousTarget: BattlePingTarget | null,
  ): void {
    const { marks, target } = this.snapshot;

    if (input.type === "attack") {
      if (
        target?.warriorId === input.warriorId &&
        target.senderName === input.senderName
      ) {
        this.setSnapshot({ marks, target: previousTarget });
      }

      return;
    }

    const mark = marks.get(input.warriorId);

    if (mark?.type !== input.type || mark.senderName !== input.senderName) {
      return;
    }

    const nextMarks = new Map(marks);
    nextMarks.delete(input.warriorId);
    this.setSnapshot({ marks: nextMarks, target });
  }

  /** Drops everything shown on a warrior, e.g. once it died. */
  removeWarrior(warriorId: number): void {
    const { marks, target } = this.snapshot;

    if (!marks.has(warriorId) && target?.warriorId !== warriorId) {
      return;
    }

    const nextMarks = new Map(marks);
    nextMarks.delete(warriorId);
    this.setSnapshot({
      marks: nextMarks,
      target: target?.warriorId === warriorId ? null : target,
    });
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
