import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

const players = [
  {
    key: "first",
    score: 128,
    width: "w-full",
    color: "bg-[var(--broadcast-lime)]",
  },
  {
    key: "second",
    score: 96,
    width: "w-3/4",
    color: "bg-[var(--broadcast-cyan)]",
  },
  {
    key: "third",
    score: 64,
    width: "w-1/2",
    color: "bg-[var(--broadcast-amber)]",
  },
] as const;

export function RankingIllustration() {
  const { t } = useTranslation();

  return (
    <figure className="relative pt-8">
      <div className="rounded-[var(--broadcast-radius-panel)] border-2 border-[var(--broadcast-ink-soft)] bg-[var(--broadcast-ink)] p-5 text-[var(--broadcast-white)] sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--broadcast-line)] pb-5">
          <p className="text-lg font-bold">
            {t("landing.illustrations.ranking")}
          </p>
          <Trophy
            className="size-7 text-[var(--broadcast-amber)]"
            aria-hidden="true"
          />
        </div>
        <ol className="mt-6 space-y-6">
          {players.map(({ key, score, width, color }, index) => (
            <li key={key} className="flex items-center gap-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full text-lg font-black text-[var(--broadcast-ink)] ${color}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex justify-between gap-2 text-sm">
                  <span className="font-bold">
                    {t(`landing.illustrations.players.${key}`)}
                  </span>
                  <span className="text-[var(--broadcast-text-muted)] tabular-nums">
                    {t("landing.illustrations.kills", { count: score })}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-[var(--broadcast-line)]/60"
                  aria-hidden="true"
                >
                  <div className={`h-full rounded-full ${width} ${color}`} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="landing-caption text-[var(--broadcast-paper-ink)]">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
