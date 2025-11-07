import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
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
interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
}
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";

interface HeadToHeadTableProps {
  data: HeadToHeadRecord[];
  isLoading?: boolean;
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
}

export function HeadToHeadTable({
  data,
  isLoading,
  characterId,
  onCharacterChange,
}: HeadToHeadTableProps) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const { data: characters } = useBattleCharacters();

  const selectedCharacter = characters?.find((c) => c.id === characterId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bilans bezpośrednich starć</CardTitle>
              <CardDescription>
                Historia walk z konkretnymi przeciwnikami (top 10)
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
              <CardTitle>Bilans bezpośrednich starć</CardTitle>
              <CardDescription>
                Historia walk z konkretnymi przeciwnikami (top 10)
              </CardDescription>
            </div>
            <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {selectedCharacter ? selectedCharacter.name : "Wszystkie postacie"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Szukaj postaci..." />
                  <CommandList>
                    <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-characters"
                        onSelect={() => {
                          onCharacterChange(undefined);
                          setCharacterOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !characterId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Wszystkie postacie
                      </CommandItem>
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
            <CardTitle>Bilans bezpośrednich starć</CardTitle>
            <CardDescription>
              Historia walk z konkretnymi przeciwnikami (top 10)
            </CardDescription>
          </div>
          <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                {selectedCharacter ? selectedCharacter.name : "Wszystkie postacie"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Szukaj postaci..." />
                <CommandList>
                  <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-characters"
                      onSelect={() => {
                        onCharacterChange(undefined);
                        setCharacterOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !characterId ? "opacity-100" : "opacity-0",
                        )}
                      />
                      Wszystkie postacie
                    </CommandItem>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Nazwa</TableHead>
                <TableHead className="text-center">Poziom</TableHead>
                <TableHead className="text-center">Profesja</TableHead>
                <TableHead className="text-center">W-P</TableHead>
                <TableHead className="text-center">Win %</TableHead>
                <TableHead className="text-right">Ostatnia walka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow key={record.opponentId}>
                  <TableCell>
                    <PlayerTile
                      player={{
                        name: record.opponentName,
                        lvl: record.opponentLvl,
                        prof: record.opponentProf,
                        icon: record.opponentIcon,
                      }}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.opponentName}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.opponentLvl}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.opponentProf}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-green-600 font-medium">
                      {record.wins}
                    </span>
                    &nbsp;-&nbsp;
                    <span className="text-red-600 font-medium">
                      {record.losses}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        record.winRate >= 50
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {record.winRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(record.lastBattleDate), {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
