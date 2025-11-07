import {
  Flame,
  Snowflake,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Streak } from "@/hooks/api/battle-log/use-battle-statistics";
import { StatCard } from "./stat-card";

interface CurrentStreakCardProps {
  data: Streak;
  isLoading?: boolean;
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
}

export function CurrentStreakCard({
  data,
  isLoading,
  characterId,
  onCharacterChange,
}: CurrentStreakCardProps) {
  const isWinStreak = data.current.type === "wins";
  const hasStreak = data.current.type !== "none" && data.current.count > 0;

  return (
    <StatCard
      title="Aktualna passa"
      description="Twoja bieżąca seria wygranych lub przegranych"
      characterId={characterId}
      onCharacterChange={onCharacterChange}
      isLoading={isLoading}
      isEmpty={false}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center min-h-[160px]">
          <div className="text-center">
            {!hasStreak ? (
              <>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-4xl text-muted-foreground">-</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Brak aktywnej passy
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center mb-2">
                  {isWinStreak ? (
                    <Flame className="w-12 h-12 text-orange-500 mr-2" />
                  ) : (
                    <Snowflake className="w-12 h-12 text-blue-400 mr-2" />
                  )}
                  <span
                    className={`text-6xl font-bold ${
                      isWinStreak ? "text-orange-500" : "text-blue-400"
                    }`}
                  >
                    {data.current.count}
                  </span>
                </div>
                <p className="text-lg font-medium">
                  {isWinStreak ? "Passa wygranych" : "Passa przegranych"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t">
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-2xl font-bold text-green-600">
                {data.longest.wins}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Najdłuższa passa wygranych
            </p>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              <span className="text-2xl font-bold text-red-600">
                {data.longest.losses}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Najdłuższa passa przegranych
            </p>
          </div>
        </div>
      </div>
    </StatCard>
  );
}
