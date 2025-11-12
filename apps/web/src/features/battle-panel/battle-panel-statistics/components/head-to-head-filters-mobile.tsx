import {
  Filter,
  Calendar,
  TrendingUp,
  User,
  Swords,
  Award,
} from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Input } from "@lootlog/ui/components/input";
import { WarriorSearchFilter } from "@/components/filters";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import type { Period } from "@/store/battle-filters.store";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";

type HeadToHeadFiltersMobileProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  selectedWarriors: Warrior[];
  showPhFilter?: boolean;
  showMatchmakingFilter?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
};

const periodOptions = [
  { value: "7d" as const, label: "Ostatnie 7 dni" },
  { value: "30d" as const, label: "Ostatnie 30 dni" },
  { value: "90d" as const, label: "Ostatnie 90 dni" },
  { value: "all" as const, label: "Cały czas" },
];

export const HeadToHeadFiltersMobile = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  matchmaking,
  selectedWarriors,
  showPhFilter = true,
  showMatchmakingFilter = true,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
  onWarriorToggle,
}: HeadToHeadFiltersMobileProps) => {
  const { data: characters = [] } = useBattleCharacters();

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtry</span>
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="mb-4">
          <DrawerTitle>Filtry bilansów</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Szukaj przeciwnika</Label>
            <WarriorSearchFilter
              selectedWarriors={selectedWarriors}
              onWarriorToggle={onWarriorToggle}
              placeholder="Szukaj przeciwnika..."
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Postać</Label>
            <Select
              value={characterId ?? "all"}
              onValueChange={(value) =>
                onCharacterChange(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <SelectValue placeholder="Wybierz postać" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie postacie</SelectItem>
                {characters.map((char) => (
                  <SelectItem key={char.id} value={char.id}>
                    {char.name} ({char.world})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Okres</Label>
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zakres poziomów</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minLevel ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    onMinLevelChange(value ? Number(value) : undefined);
                  }}
                  min={1}
                  max={500}
                  className="w-full"
                />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxLevel ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    onMaxLevelChange(value ? Number(value) : undefined);
                  }}
                  min={1}
                  max={500}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {showPhFilter && (
            <div className="flex items-center justify-between border rounded-md p-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <Label
                  htmlFor="ph-filter-h2h-mobile"
                  className="cursor-pointer"
                >
                  Punkty Honoru
                </Label>
              </div>
              <Checkbox
                id="ph-filter-h2h-mobile"
                checked={ph === true}
                onCheckedChange={(checked) => onPhChange(checked === true)}
              />
            </div>
          )}

          {showMatchmakingFilter && (
            <div className="flex items-center justify-between border rounded-md p-3">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4" />
                <Label
                  htmlFor="matchmaking-filter-h2h-mobile"
                  className="cursor-pointer"
                >
                  Otchłań
                </Label>
              </div>
              <Checkbox
                id="matchmaking-filter-h2h-mobile"
                checked={matchmaking === true}
                onCheckedChange={(checked) =>
                  onMatchmakingChange(checked === true)
                }
              />
            </div>
          )}
        </div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Zamknij
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
