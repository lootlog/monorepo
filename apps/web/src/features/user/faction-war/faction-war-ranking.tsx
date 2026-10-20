import { FactionWarLayout } from "./faction-war-layout";
import { FactionWarRankingResults } from "./faction-war-ranking-results";

export const FactionWarRanking = () => (
  <FactionWarLayout tab="ranking">
    {(war) => <FactionWarRankingResults war={war} />}
  </FactionWarLayout>
);
