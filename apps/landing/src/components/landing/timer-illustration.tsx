import { Check, Gem, Swords, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const spawnDelay = 42 * 60 + 18;

export function TimerIllustration() {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(spawnDelay);

  useEffect(() => {
    const deadline = Date.now() + spawnDelay * 1000;
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const countdown = `00:${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <figure className="relative mx-auto w-full max-w-xl text-[var(--broadcast-text-muted)] px-1 py-3 sm:px-6 sm:py-8">
      <div className="relative rounded-[var(--broadcast-radius-panel)] border-2 border-[var(--broadcast-ink)] bg-[var(--broadcast-lime)] p-4 text-[var(--broadcast-ink)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-widest">
            {t("landing.illustrations.timer")}
          </p>
          <Swords className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-4 text-lg font-bold sm:mt-9 sm:text-2xl">
          {t("landing.illustrations.opponent")}
        </p>
        <p
          role="timer"
          aria-live="off"
          className="mt-2 font-mono text-[clamp(2.75rem,6.8vw,5rem)] font-bold leading-none tracking-[-0.07em] tabular-nums"
        >
          {countdown}
        </p>
        <div
          aria-hidden="true"
          className="mt-4 h-2 sm:mt-7 overflow-hidden rounded-full bg-[var(--broadcast-ink)]/15"
        >
          <div
            className="h-full rounded-full bg-[var(--broadcast-ink)]"
            style={{ width: `${(remaining / (60 * 60)) * 100}%` }}
          />
        </div>
        <p className="mt-3 flex items-center sm:mt-5 gap-2 text-sm font-semibold">
          <UsersRound className="size-4" aria-hidden="true" />
          {t("landing.illustrations.shared")}
        </p>
      </div>
      <div className="relative -mt-2 ml-5 flex sm:-mt-3 sm:ml-8 items-center gap-3 rounded-[var(--broadcast-radius-card)] sm:gap-4 border-2 border-[var(--broadcast-ink)] bg-[var(--broadcast-paper)] p-3 text-[var(--broadcast-ink)] sm:p-5">
        <span className="grid size-10 shrink-0 sm:size-14 place-items-center rounded-[var(--broadcast-radius-card)] bg-[var(--broadcast-amber)]">
          <Gem className="size-6 sm:size-8" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--broadcast-paper-muted)]">
            {t("landing.illustrations.loot")}
          </p>
          <p className="mt-1 text-base font-bold sm:text-lg">
            {t("landing.illustrations.items.gem")}
          </p>
        </div>
        <Check className="size-5 shrink-0" aria-hidden="true" />
      </div>
      <figcaption className="landing-caption">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
