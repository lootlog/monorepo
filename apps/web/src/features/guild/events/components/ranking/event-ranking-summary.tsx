import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";

type EventRankingSummaryProps = {
  eventName: string;
  selectedHeroName?: string | null;
};

export const EventRankingSummary = ({
  eventName,
  selectedHeroName,
}: EventRankingSummaryProps) => {
  const { t } = useTranslation();

  return (
    <PageHeader
      icon={Trophy}
      title={selectedHeroName ?? eventName}
      description={t("events.ranking.title")}
      metadata={selectedHeroName ? eventName : undefined}
    />
  );
};
