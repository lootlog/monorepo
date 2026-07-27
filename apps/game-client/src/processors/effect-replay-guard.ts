const EFFECT_REPLAY_WINDOW_MS = 1_000;
const MAX_RECENT_EFFECT_KEYS = 100;

export class EffectReplayGuard {
  private readonly recentEffectKeys = new Map<string, number>();

  reserve(effectKey: string): boolean {
    const now = Date.now();
    this.pruneExpiredKeys(now);

    if (this.recentEffectKeys.has(effectKey)) {
      return false;
    }

    this.recentEffectKeys.set(effectKey, now);
    if (this.recentEffectKeys.size > MAX_RECENT_EFFECT_KEYS) {
      const oldestEffectKey = this.recentEffectKeys.keys().next().value;
      if (oldestEffectKey !== undefined) {
        this.recentEffectKeys.delete(oldestEffectKey);
      }
    }

    return true;
  }

  forget(effectKey: string): void {
    this.recentEffectKeys.delete(effectKey);
  }

  private pruneExpiredKeys(now: number): void {
    for (const [effectKey, recordedAt] of this.recentEffectKeys) {
      if (now - recordedAt >= EFFECT_REPLAY_WINDOW_MS) {
        this.recentEffectKeys.delete(effectKey);
      }
    }
  }
}
