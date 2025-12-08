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
import { Switch } from "@lootlog/ui/components/switch";
import { useEventMutations } from "../hooks/use-event-mutations";
import { useEffect } from "react";
import { toast } from "sonner";

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    guildId: string;
    name: string;
    active: boolean;
    startsAt?: string;
    endsAt?: string;
  };
}

interface FormData {
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
}

export const EventEditDialog = ({
  open,
  onOpenChange,
  event,
}: EventEditDialogProps) => {
  const { updateEvent } = useEventMutations(event.guildId, event.id);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      name: event.name,
      active: event.active,
      startsAt: event.startsAt
        ? new Date(event.startsAt).toISOString().slice(0, 16)
        : "",
      endsAt: event.endsAt
        ? new Date(event.endsAt).toISOString().slice(0, 16)
        : "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: event.name,
        active: event.active,
        startsAt: event.startsAt
          ? new Date(event.startsAt).toISOString().slice(0, 16)
          : "",
        endsAt: event.endsAt
          ? new Date(event.endsAt).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [open, event, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateEvent.mutateAsync({
        name: data.name,
        active: data.active,
        startsAt: data.startsAt
          ? new Date(data.startsAt).toISOString()
          : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
      });
      toast.success("Zapisano zmiany");
      onOpenChange(false);
    } catch (error) {
      toast.error("Wystąpił błąd podczas zapisywania zmian");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa eventu</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={watch("active")}
              onCheckedChange={(val) => setValue("active", val)}
              id="active"
            />
            <Label htmlFor="active">Aktywny</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Data rozpoczęcia</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                {...register("startsAt")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Data zakończenia</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                {...register("endsAt")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
