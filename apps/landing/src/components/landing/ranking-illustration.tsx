import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

const players = [
  { key: "first", score: 128, width: "w-full", color: "bg-[#c8f135]" },
  { key: "second", score: 96, width: "w-3/4", color: "bg-[#35d3e4]" },
  { key: "third", score: 64, width: "w-1/2", color: "bg-[#ffbd3f]" },
] as const;

export function RankingIllustration() {
  const { t } = useTranslation();

  return (
    <figure className="relative py-8">
      <div className="rounded-[1.75rem] border-2 border-[#22334c] bg-[#07111f] p-5 text-[#f7f8f2] sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-[#31425b] pb-5">
          <p className="text-lg font-bold">
            {t("landing.illustrations.ranking")}
          </p>
          <Trophy className="size-7 text-[#ffbd3f]" aria-hidden="true" />
        </div>
        <ol className="mt-6 space-y-6">
          {players.map(({ key, score, width, color }, index) => (
            <li key={key} className="flex items-center gap-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full text-lg font-black text-[#07111f] ${color}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex justify-between gap-2 text-sm">
                  <span className="font-bold">
                    {t(`landing.illustrations.players.${key}`)}
                  </span>
                  <span className="text-[#b9c8de]">
                    {t("landing.illustrations.kills", { count: score })}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-[#24334a]"
                  aria-hidden="true"
                >
                  <div className={`h-full rounded-full ${width} ${color}`} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-5 text-center text-xs font-medium text-[var(--broadcast-ink)]">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
