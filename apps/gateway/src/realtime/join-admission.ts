interface JoinAdmissionLimits {
  /** Sustained joins per second on this replica. */
  readonly ratePerSecond: number;
  /** Joins admitted at once after a quiet period. */
  readonly burst: number;
  /**
   * Joins running at once. Kept below the 64 command slots so heartbeats of
   * established sessions still run while a reconnect burst joins.
   */
  readonly concurrent: number;
  /** Rejected joins retry after a random delay in this range. */
  readonly retryAfterMs: { readonly min: number; readonly max: number };
}

const defaultLimits = {
  ratePerSecond: 100,
  burst: 200,
  concurrent: 32,
  retryAfterMs: { min: 1_000, max: 5_000 },
} satisfies JoinAdmissionLimits;

export type JoinAdmissionResult =
  | { readonly admitted: true; readonly release: () => void }
  | { readonly admitted: false; readonly retryAfterMs: number };

/**
 * Token bucket and concurrency cap for `session.join` on one replica. Joins
 * are the expensive command of a reconnect storm: they verify proofs and read
 * permissions from the API.
 */
export class JoinAdmission {
  private tokens: number;
  private refilledAt: number;
  private active = 0;
  private rejected = 0;

  constructor(
    private readonly limits: JoinAdmissionLimits = defaultLimits,
    private readonly now: () => number = performance.now.bind(performance),
    private readonly random: () => number = Math.random,
  ) {
    this.tokens = limits.burst;
    this.refilledAt = now();
  }

  tryAcquire(): JoinAdmissionResult {
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
    return { joinsActive: this.active, joinsRejected: this.rejected };
  }
}
