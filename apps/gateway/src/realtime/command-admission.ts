import { Context, Layer } from "effect";

interface CommandAdmissionLimits {
  readonly ratePerSecond: number;
  readonly burst: number;
  readonly concurrent: number;
  readonly retryAfterMs: { readonly min: number; readonly max: number };
}

export const JOIN_ADMISSION_LIMITS = {
  ratePerSecond: 250,
  burst: 1_000,
  concurrent: 48,
  retryAfterMs: { min: 500, max: 3_000 },
} satisfies CommandAdmissionLimits;

const AIR_TAG_OBSERVATION_ADMISSION_LIMITS = {
  ratePerSecond: 300,
  burst: 600,
  concurrent: 8,
  retryAfterMs: { min: 1_000, max: 3_000 },
} satisfies CommandAdmissionLimits;

export type CommandAdmissionResult =
  | { readonly admitted: true; readonly release: () => void }
  | { readonly admitted: false; readonly retryAfterMs: number };

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

export class CommandAdmissions extends Context.Service<
  CommandAdmissions,
  {
    readonly joins: CommandAdmission;
    readonly airTagObservations: CommandAdmission;
  }
>()("@lootlog/gateway/realtime/CommandAdmissions") {
  static readonly layer = Layer.sync(CommandAdmissions, () =>
    CommandAdmissions.of({
      joins: new CommandAdmission(JOIN_ADMISSION_LIMITS),
      airTagObservations: new CommandAdmission(
        AIR_TAG_OBSERVATION_ADMISSION_LIMITS,
      ),
    }),
  );
}
