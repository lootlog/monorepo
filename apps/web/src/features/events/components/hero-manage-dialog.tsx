"use client";

import { useForm } from "react-hook-form";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useEventMutations } from "../hooks/use-event-mutations";
import { useEffect } from "react";
import { toast } from "sonner";
import { Textarea } from "@lootlog/ui/components/textarea";

interface HeroManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero?: {
    id: string;
    npcId: number;
    npcName: string;
  } | null;
}

interface FormData {
  npcId: number;
  npcName: string;
  maps: string; // Comma separated for new hero
}

export const HeroManageDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  hero,
}: HeroManageDialogProps) => {
  const { addHero, updateHero } = useEventMutations(guildId, eventId);
  const isEditing = !!hero;

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      npcId: 0,
      npcName: "",
      maps: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (hero) {
        reset({
          npcId: hero.npcId,
          npcName: hero.npcName,
          maps: "",
        });
      } else {
        reset({
          npcId: 0,
          npcName: "",
          maps: "",
        });
      }
    }
  }, [open, hero, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && hero) {
        await updateHero.mutateAsync({
          heroId: hero.id,
          data: {
            npcName: data.npcName,
          },
        });
        toast.success("Zaktualizowano herosa");
      } else {
        const maps = data.maps
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);

        await addHero.mutateAsync({
          npcId: Number(data.npcId),
          npcName: data.npcName,
          maps: maps,
        });
        toast.success("Dodano herosa");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Wystąpił błąd");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj herosa" : "Dodaj herosa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="npcId">ID NPC</Label>
            <Input
              id="npcId"
              type="number"
              {...register("npcId", { required: true, valueAsNumber: true })}
              disabled={isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="npcName">Nazwa NPC</Label>
            <Input id="npcName" {...register("npcName", { required: true })} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="maps">Mapy (oddziel przecinkiem)</Label>
              <Textarea
                id="maps"
                placeholder="Nizina Wieśniaków, Stare Ruiny"
                {...register("maps")}
              />
              <p className="text-xs text-muted-foreground">
                Dodatkowe mapy można dodać później w edycji
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={addHero.isPending || updateHero.isPending}
            >
              {addHero.isPending || updateHero.isPending
                ? "Zapisywanie..."
                : "Zapisz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
