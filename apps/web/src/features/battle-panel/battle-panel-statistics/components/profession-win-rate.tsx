import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Button } from "@lootlog/ui/components/button";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
interface ProfessionWinRate {
  prof: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
}
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useState } from "react";
import { PlayerTile } from "@/components/battle";

interface ProfessionWinRateChartProps {
  data: ProfessionWinRate[];
  isLoading?: boolean;
  characterId?: string;
  onCharacterChange: (characterId: string) => void;
}

const chartConfig = {
  winRate: {
    label: "Współczynnik wygranych %",
  },
} satisfies ChartConfig;

const getColorByWinRate = (winRate: number): string => {
  if (winRate >= 70) return "hsl(142, 71%, 45%)";
  if (winRate >= 55) return "hsl(43, 96%, 56%)";
  if (winRate >= 45) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
};

export function ProfessionWinRateChart({
  data,
  isLoading,
  characterId,
  onCharacterChange,
}: ProfessionWinRateChartProps) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const { data: characters } = useBattleCharacters();

  const selectedCharacter = characters?.find((c) => c.id === characterId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Współczynnik wygranych vs profesja</CardTitle>
              <CardDescription>
                Twój procent wygranych przeciwko każdej profesji w walkach 1v1
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Współczynnik wygranych vs profesja</CardTitle>
              <CardDescription>
                Twój procent wygranych przeciwko każdej profesji w walkach 1v1
              </CardDescription>
            </div>
            <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {selectedCharacter ? selectedCharacter.name : "Wybierz postać"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Szukaj postaci..." />
                  <CommandList>
                    <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
                    <CommandGroup>
                      {characters?.map((character) => (
                        <CommandItem
                          key={character.id}
                          value={character.name}
                          onSelect={() => {
                            onCharacterChange(character.id);
                            setCharacterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              characterId === character.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <PlayerTile
                              player={{
                                name: character.name,
                                icon: character.icon,
                              }}
                              className="scale-75"
                            />
                            <span>{character.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({character.world})
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Brak danych o walkach
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Współczynnik wygranych vs profesja</CardTitle>
            <CardDescription>
              Twój procent wygranych przeciwko każdej profesji w walkach 1v1
            </CardDescription>
          </div>
          <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                {selectedCharacter ? selectedCharacter.name : "Wybierz postać"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Szukaj postaci..." />
                <CommandList>
                  <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
                  <CommandGroup>
                    {characters?.map((character) => (
                      <CommandItem
                        key={character.id}
                        value={character.name}
                        onSelect={() => {
                          onCharacterChange(character.id);
                          setCharacterOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            characterId === character.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <PlayerTile
                            player={{
                              name: character.name,
                              icon: character.icon,
                            }}
                            className="scale-75"
                          />
                          <span>{character.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({character.world})
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="prof"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 100]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                indicator="line"
                labelFormatter={(value, payload) => {
                  const item = payload[0]?.payload as unknown as ProfessionWinRate;
                  return `${value} (${item?.totalBattles || 0} walk)`;
                }}
                formatter={(value) => [`${value}%`, "Współczynnik"]}
              />}
            />
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorByWinRate(entry.winRate)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
