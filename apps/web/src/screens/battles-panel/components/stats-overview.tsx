import { Badge } from "@lootlog/ui/components/badge";
import {
  TrendingUp,
  TrendingDown,
  Swords,
  Trophy,
  Target,
  Zap,
} from "lucide-react";

export function StatsOverview() {
  const stats = [
    {
      title: "Łączne walki",
      value: "1,247",
      change: "+12%",
      trend: "up",
      icon: Swords,
      description: "w tym tygodniu",
    },
    {
      title: "Współczynnik wygranych",
      value: "68.4%",
      change: "+2.1%",
      trend: "up",
      icon: Trophy,
      description: "ostatnie 30 dni",
    },
    {
      title: "Zdobyte punkty honoru",
      value: "2847",
      change: "-5.2%",
      trend: "down",
      icon: Target,
      description: "w tym tygodniu",
    },
    {
      title: "Średnia ilość klątw w walce",
      value: "12",
      change: "+1",
      trend: "up",
      icon: Zap,
      description: "w tym tygodniu",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="relative overflow-hidden">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </div>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant={stat.trend === "up" ? "default" : "secondary"}
                  className={`gap-1 ${
                    stat.trend === "up"
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </Badge>
                <span>{stat.description}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
