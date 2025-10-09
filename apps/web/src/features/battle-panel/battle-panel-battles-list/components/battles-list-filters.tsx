import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Search, Trophy, Globe, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

export type BattleFilters = {
  world?: string;
  type?: string;
  search?: string;
};

type BattlesListFiltersProps = {
  filters: BattleFilters;
  onFiltersChange: (filters: BattleFilters) => void;
};

export const BattlesListFilters = ({
  filters,
  onFiltersChange,
}: BattlesListFiltersProps) => {
  const handleWorldChange = (value: string) => {
    onFiltersChange({
      ...filters,
      world: value === "all" ? undefined : value,
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === "all" ? undefined : value,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value || undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.world || filters.type || filters.search;

  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Filtry</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Wyczyść
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Szukaj po graczu..."
            value={filters.search || ""}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.world || "all"}
          onValueChange={handleWorldChange}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <SelectValue placeholder="Świat" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie światy</SelectItem>
            <SelectItem value="Aldous">Aldous</SelectItem>
            <SelectItem value="Berenike">Berenike</SelectItem>
            <SelectItem value="Charlan">Charlan</SelectItem>
            <SelectItem value="Demeter">Demeter</SelectItem>
            <SelectItem value="Eferia">Eferia</SelectItem>
            <SelectItem value="Fobos">Fobos</SelectItem>
            <SelectItem value="Grimmar">Grimmar</SelectItem>
            <SelectItem value="Hutena">Hutena</SelectItem>
            <SelectItem value="Illith">Illith</SelectItem>
            <SelectItem value="Jarelo">Jarelo</SelectItem>
            <SelectItem value="Katrina">Katrina</SelectItem>
            <SelectItem value="Labellis">Labellis</SelectItem>
            <SelectItem value="Merdian">Merdian</SelectItem>
            <SelectItem value="Nubes">Nubes</SelectItem>
            <SelectItem value="Osara">Osara</SelectItem>
            <SelectItem value="Pelgia">Pelgia</SelectItem>
            <SelectItem value="Quara">Quara</SelectItem>
            <SelectItem value="Reinor">Reinor</SelectItem>
            <SelectItem value="Siberia">Siberia</SelectItem>
            <SelectItem value="Taria">Taria</SelectItem>
            <SelectItem value="Uldona">Ulona</SelectItem>
            <SelectItem value="Verdal">Verdal</SelectItem>
            <SelectItem value="Welnar">Welnar</SelectItem>
            <SelectItem value="Zaria">Zaria</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.type || "all"} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <SelectValue placeholder="Typ walki" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="1v1">1v1</SelectItem>
            <SelectItem value="2v2">2v2</SelectItem>
            <SelectItem value="3v3">3v3</SelectItem>
            <SelectItem value="4v4">4v4</SelectItem>
            <SelectItem value="1v2">1v2</SelectItem>
            <SelectItem value="2v1">2v1</SelectItem>
            <SelectItem value="1v3">1v3</SelectItem>
            <SelectItem value="3v1">3v1</SelectItem>
            <SelectItem value="2v3">2v3</SelectItem>
            <SelectItem value="3v2">3v2</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
