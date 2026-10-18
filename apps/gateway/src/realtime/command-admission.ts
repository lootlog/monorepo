interface CommandAdmissionLimits {
  /** Sustained commands per second on this replica. */
  readonly ratePerSecond: number;
  /** Commands admitted at once after a quiet period. */
  readonly burst: number;
  /** Commands running at once, out of the 64 command slots. */
  readonly concurrent: number;
  /** Rejected commands retry after a random delay in this range. */
  readonly retryAfterMs: { readonly min: number; readonly max: number };
}

/**
 * Joins are the expensive command of a reconnect storm: they verify proofs and
 * read permissions from the API. A join served from the permission cache takes
 * milliseconds, so the rate lets a restarted replica readmit its sessions
 * within seconds. The concurrency cap bounds API load when the cache is cold
 * and leaves 16 slots so heartbeats of established sessions still run.
 */
export const JOIN_ADMISSION_LIMITS = {
  ratePerSecond: 250,
  burst: 1_000,
  concurrent: 48,
  retryAfterMs: { min: 500, max: 3_000 },
} satisfies CommandAdmissionLimits;

/**
 * Every game client on the new interface publishes AirTag batches every
 * 250 ms. Unbounded, they fill the command slots and the event loop, so
 * heartbeats and joins time out. A rejected batch loses nothing: the client
 * merges it into its next batch. The 8 slots leave 8 free while joins hold
 * theirs; 300 batches per second is about half of what one replica served
 * before heartbeats started to time out.
 */
export const AIR_TAG_OBSERVATION_ADMISSION_LIMITS = {
  ratePerSecond: 300,
  burst: 600,
  concurrent: 8,
  retryAfterMs: { min: 1_000, max: 3_000 },
} satisfies CommandAdmissionLimits;

export type CommandAdmissionResult =
  | { readonly admitted: true; readonly release: () => void }
  | { readonly admitted: false; readonly retryAfterMs: number };

/** Token bucket and concurrency cap for one command type on one replica. */
export class CommandAdmission {
  private tokens: number;
  private refilledAt: number;
  private active = 0;
  private rejected = 0;

  constructor(
    private readonly limits: CommandAdmissionLimits,
    private readonly now: () => number = performance.now.bind(performance),
    private readonly random: () => number = Math.random,
  ) {
    this.tokens = limits.burst;
    this.refilledAt = now();
  }

  tryAcquire(): CommandAdmissionResult {
    const now = this.now();

    this.tokens = Math.min(
      this.limits.burst,
      this.tokens +
        ((now - this.refilledAt) / 1_000) * this.limits.ratePerSecond,
    );
    this.refilledAt = now;

    if (this.tokens < 1 || this.active >= this.limits.concurrent) {
      this.rejected++;
      const { min, max } = this.limits.retryAfterMs;

      return {
        admitted: false,
        retryAfterMs: Math.round(min + this.random() * (max - min)),
      };
    }

    this.tokens -= 1;
    this.active++;
    let released = false;

    return {
      admitted: true,
      release: () => {
        if (released) return;
        released = true;
        this.active--;
      },
    };
  }

  getDiagnostics() {
    return { active: this.active, rejected: this.rejected };
  }
}
