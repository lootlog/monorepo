import { createFileRoute } from "@tanstack/react-router";
import { AnguishCalculator } from "@/components/calculators/anguish-calculator";
import { AttackSpeedCalculator } from "@/components/calculators/attack-speed-calculator";
import { DefenceChanceCalculator } from "@/components/calculators/defence-chance-calculator";
import { HolyTouchCalculator } from "@/components/calculators/holy-touch-calculator";
import { LegendaryBonusCalculator } from "@/components/calculators/legendary-bonus-calculator";
import { ProfessionChangeCalculator } from "@/components/calculators/profession-change-calculator";
import { QuestExperienceCalculator } from "@/components/calculators/quest-experience-calculator";
import { TransferCostCalculator } from "@/components/calculators/transfer-cost-calculator";
import { UnbindCostCalculator } from "@/components/calculators/unbind-cost-calculator";
import { t } from "@/i18n/messages";

// The calculators in page order, official formulas first; each card's id
// is its anchor.
const CONTENTS = [
  { id: "unik-i-blok", titleKey: "calculators.defence.title" },
  { id: "szybkosc-ataku", titleKey: "calculators.attackSpeed.title" },
  { id: "bonus-legendarny", titleKey: "calculators.legendary.title" },
  { id: "krwawa-udreka", titleKey: "calculators.anguish.title" },
  { id: "dotyk-aniola", titleKey: "calculators.holyTouch.title" },
  { id: "przeniesienie-postaci", titleKey: "calculators.transfer.title" },
  { id: "odwiazanie", titleKey: "calculators.unbind.title" },
  { id: "zmiana-profesji", titleKey: "calculators.profession.title" },
  { id: "doswiadczenie-z-questa", titleKey: "calculators.quest.title" },
] as const;

export const Route = createFileRoute("/calculators")({
  component: CalculatorsRoute,
  head: () => ({
    meta: [{ title: `${t("calculators.metaTitle")} | ${t("meta.title")}` }],
  }),
});

function CalculatorsRoute() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("calculators.title")}
          </h1>
          <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
            {t("calculators.description")}
          </p>
        </div>
        <nav aria-label={t("calculators.contents")}>
          <ul className="flex flex-wrap gap-2">
            {CONTENTS.map(({ id, titleKey }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex h-8 items-center rounded-md border border-border bg-background/60 px-3 text-xs font-medium text-foreground outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {t(titleKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <DefenceChanceCalculator />
      <AttackSpeedCalculator />
      <LegendaryBonusCalculator />
      <AnguishCalculator />
      <HolyTouchCalculator />
      <TransferCostCalculator />
      <UnbindCostCalculator />
      <ProfessionChangeCalculator />
      <QuestExperienceCalculator />
    </div>
  );
}
