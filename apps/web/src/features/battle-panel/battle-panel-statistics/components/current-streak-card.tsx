import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import type { Streak } from "@/hooks/api/battle-log/use-battle-statistics";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";

interface CurrentStreakCardProps {
  data: Streak;
  isLoading?: boolean;
}

export function CurrentStreakCard({ data, isLoading }: CurrentStreakCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktualna passa</CardTitle>
          <CardDescription>
            Twoja bieżąca seria wygranych lub przegranych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isWinStreak = data.current.type === "wins";
  const hasStreak = data.current.type !== "none" && data.current.count > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktualna passa</CardTitle>
        <CardDescription>
          Twoja bieżąca seria wygranych lub przegranych
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            {!hasStreak ? (
              <>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-4xl text-muted-foreground">-</span>
                </div>
                <p className="text-sm text-muted-foreground">Brak aktywnej passy</p>
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

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-2xl font-bold text-green-600">
                {data.longest.wins}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Najdłuższa passa wygranych</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              <span className="text-2xl font-bold text-red-600">
                {data.longest.losses}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Najdłuższa passa przegranych</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
