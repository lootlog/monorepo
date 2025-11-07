import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { CharacterSelector } from "./character-selector";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  description: string;
  characterId?: string;
  onCharacterChange?: (characterId: string | undefined) => void;
  allowAllCharacters?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function StatCard({
  title,
  description,
  characterId,
  onCharacterChange,
  allowAllCharacters = false,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "Brak danych",
  children,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onCharacterChange && (
            <CharacterSelector
              characterId={characterId}
              onCharacterChange={onCharacterChange}
              allowAllCharacters={allowAllCharacters}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          </div>
        ) : isEmpty ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
