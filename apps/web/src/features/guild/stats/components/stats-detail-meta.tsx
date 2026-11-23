import { DetailBarFact } from "@/components/common/detail-bar-fact";
import { DetailBarFacts } from "@/components/common/detail-bar-facts";

type StatsDetailMetaProps = {
  facts: { key: string; label: string; value: string }[];
};

export const StatsDetailMeta = ({ facts }: StatsDetailMetaProps) => (
  <DetailBarFacts>
    {facts.map((fact) => (
      <DetailBarFact key={fact.key} label={fact.label}>
        {fact.value}
      </DetailBarFact>
    ))}
  </DetailBarFacts>
);
