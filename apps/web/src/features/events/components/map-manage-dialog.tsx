"use client";

import { useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { MapInput } from "./map-input";
import { Label } from "@lootlog/ui/components/label";
import { useEventMutations } from "../hooks/use-event-mutations";
import { toast } from "sonner";
import { Trash2, MapPin, Plus } from "lucide-react";

interface MapManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero: {
    id: string;
    npcName: string;
    maps: {
      id: string;
      mapName: string;
    }[];
  };
}

import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";

export const MapManageDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  hero,
}: MapManageDialogProps) => {
  const { addMap, deleteMap } = useEventMutations(guildId, eventId);
  const [newMapName, setNewMapName] = useState("");

  const handleAddMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapName.trim()) return;

    try {
      await addMap.mutateAsync({
        heroId: hero.id,
        data: { mapName: newMapName.trim() },
      });
      toast.success("Dodano mapę");
      setNewMapName("");
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error("Ta mapa już istnieje");
      } else {
        toast.error("Błąd podczas dodawania mapy");
      }
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    // No confirmation needed inside handler, handled by dialog
    try {
      await deleteMap.mutateAsync({
        heroId: hero.id,
        mapId: mapId,
      });
      toast.success("Usunięto mapę");
    } catch (error) {
      toast.error("Błąd podczas usuwania mapy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zarządzaj mapami - {hero.npcName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Add Map Form */}
          <form onSubmit={handleAddMap} className="flex gap-2">
            <MapInput
              placeholder="Nazwa mapy"
              value={newMapName}
              onChange={setNewMapName}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={addMap.isPending || !newMapName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj
            </Button>
          </form>

          {/* Maps List */}
          <div className="space-y-2">
            <Label>Lista map ({hero.maps.length})</Label>
            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
              {hero.maps.map((map) => (
                <div
                  key={map.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{map.mapName}</span>
                  </div>
                  <ConfirmDeleteDialog
                    onConfirm={() => handleDeleteMap(map.id)}
                    title="Usunąć mapę?"
                    description={`Czy na pewno chcesz usunąć mapę ${map.mapName}?`}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMap.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                  />
                </div>
              ))}
              {hero.maps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Brak przypisanych map
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
