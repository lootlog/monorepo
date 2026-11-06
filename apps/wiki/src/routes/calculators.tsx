import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnguishCalculator } from "@/components/calculators/anguish-calculator";
import { AttackSpeedCalculator } from "@/components/calculators/attack-speed-calculator";
import {
  type CalculatorId,
  DEFAULT_CALCULATOR,
  isCalculatorId,
} from "@/components/calculators/calculator-list";
import { CalculatorNav } from "@/components/calculators/calculator-nav";
import { DefenceChanceCalculator } from "@/components/calculators/defence-chance-calculator";
import { HolyTouchCalculator } from "@/components/calculators/holy-touch-calculator";
import { LegendaryBonusCalculator } from "@/components/calculators/legendary-bonus-calculator";
import { ProfessionChangeCalculator } from "@/components/calculators/profession-change-calculator";
import { QuestExperienceCalculator } from "@/components/calculators/quest-experience-calculator";
import { TransferCostCalculator } from "@/components/calculators/transfer-cost-calculator";
import { UnbindCostCalculator } from "@/components/calculators/unbind-cost-calculator";
import { PageHeader } from "@/components/common/page-header";
import { t } from "@/i18n/messages";

const CALCULATORS: Record<CalculatorId, () => React.JSX.Element> = {
  "unik-i-blok": DefenceChanceCalculator,
  "szybkosc-ataku": AttackSpeedCalculator,
  "bonus-legendarny": LegendaryBonusCalculator,
  "krwawa-udreka": AnguishCalculator,
  "dotyk-aniola": HolyTouchCalculator,
  "przeniesienie-postaci": TransferCostCalculator,
  odwiazanie: UnbindCostCalculator,
  "zmiana-profesji": ProfessionChangeCalculator,
  "doswiadczenie-z-questa": QuestExperienceCalculator,
};

export const Route = createFileRoute("/calculators")({
  component: CalculatorsRoute,
  head: () => ({
    meta: [{ title: `${t("calculators.metaTitle")} | ${t("meta.title")}` }],
  }),
  validateSearch: (search: {
    calculator?: unknown;
  }): { calculator?: CalculatorId } =>
    isCalculatorId(search.calculator) ? { calculator: search.calculator } : {},
});

function CalculatorsRoute() {
  const { calculator } = Route.useSearch();
  const navigate = Route.useNavigate();
  const current = calculator ?? DEFAULT_CALCULATOR;
  const Calculator = CALCULATORS[current];

  // Links shared when every calculator had its own anchor open that one.
  useEffect(() => {
    const anchor = decodeURIComponent(window.location.hash.slice(1));

    if (!calculator && isCalculatorId(anchor)) {
      void navigate({ search: { calculator: anchor }, replace: true });
    }
  }, [calculator, navigate]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title={t("calculators.title")}
        description={t("calculators.description")}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 lg:sticky lg:top-20">
          <CalculatorNav current={current} />
        </div>
        <Calculator key={current} />
      </div>
    </div>
  );
}
