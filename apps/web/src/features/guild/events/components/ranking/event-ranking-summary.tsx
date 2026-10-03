import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { EventHeroContext } from "../shared/event-hero-context";

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
      title={t("events.ranking.title")}
      description={eventName}
      metadata={<EventHeroContext heroName={selectedHeroName} />}
    />
  );
};
