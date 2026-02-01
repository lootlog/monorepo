import { PlayerKillStatsCard } from "./components/player-kill-stats-card";

export const Home: React.FC = () => {
  return (
    <div className="w-full h-full p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <PlayerKillStatsCard />
        </div>
      </div>
    </div>
  );
};
