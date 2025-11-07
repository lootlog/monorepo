import type { BattleDurationStats } from "@/hooks/api/battle-log/use-battle-statistics";
import { Clock, Zap, Hourglass } from "lucide-react";
import { StatCard } from "./stat-card";

interface BattleDurationStatsCardProps {
  data: BattleDurationStats;
  isLoading?: boolean;
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
}

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function BattleDurationStatsCard({
  data,
  isLoading,
  characterId,
  onCharacterChange,
}: BattleDurationStatsCardProps) {
  const hasData =
    data.avgWinDuration > 0 ||
    data.avgLossDuration > 0 ||
    data.fastest ||
    data.longest;

  return (
    <StatCard
      title="Czas trwania walk"
      description="Porównanie średniego czasu walk i ekstrema"
      characterId={characterId}
      onCharacterChange={onCharacterChange}
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="Brak danych o walkach"
    >
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-4 min-h-[160px] items-center">
          <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-600">Wygrane</span>
            </div>
            <p className="text-3xl font-bold">
              {data.avgWinDuration > 0
                ? formatDuration(data.avgWinDuration)
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Średni czas</p>
          </div>

          <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-600">Przegrane</span>
            </div>
            <p className="text-3xl font-bold">
              {data.avgLossDuration > 0
                ? formatDuration(data.avgLossDuration)
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Średni czas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t">
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 text-yellow-600 mr-1" />
              <span className="text-sm font-medium">Najszybsza</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {data.fastest ? formatDuration(data.fastest.duration) : "-"}
            </p>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-2">
              <Hourglass className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-sm font-medium">Najdłuższa</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {data.longest ? formatDuration(data.longest.duration) : "-"}
            </p>
          </div>
        </div>
      </div>
    </StatCard>
  );
}
