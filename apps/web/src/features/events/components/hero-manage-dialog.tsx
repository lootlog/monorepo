"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Swords, Plus, Pencil, Loader2, Info } from "lucide-react";
import { useEventMutations } from "../hooks/use-event-mutations";
import { toast } from "sonner";

interface HeroManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero?: {
    id: string;
    npcId: number | null;
    npcName: string;
  } | null;
}

interface FormData {
  npcId: string;
  npcName: string;
}

export const HeroManageDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  hero,
}: HeroManageDialogProps) => {
  const { t } = useTranslation();
  const { addHero, updateHero } = useEventMutations(guildId, eventId);
  const isEditing = !!hero;
  const isPending = addHero.isPending || updateHero.isPending;

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      npcId: "",
      npcName: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (hero) {
        reset({
          npcId: hero.npcId?.toString() ?? "",
          npcName: hero.npcName,
        });
      } else {
        reset({
          npcId: "",
          npcName: "",
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
        toast.success(t("events.heroes.updated", "Zaktualizowano herosa"));
      } else {
        const npcIdNum = data.npcId ? Number(data.npcId) : undefined;
        await addHero.mutateAsync({
          ...(npcIdNum && { npcId: npcIdNum }),
          npcName: data.npcName,
        });
        toast.success(t("events.heroes.added", "Dodano herosa"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("common.error", "Wystąpił błąd"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Swords className="size-4 text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {isEditing
                  ? t("events.heroes.edit", "Edytuj herosa")
                  : t("events.heroes.add", "Dodaj herosa")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEditing
                  ? hero?.npcName
                  : t(
                      "events.heroes.addDescription",
                      "Dodaj nowego herosa do eventu"
                    )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="hero-manage-form"
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.heroIdLabel", "ID NPC")}
              </Label>
              <Input
                type="number"
                placeholder={t("events.createDialog.heroIdPlaceholder", "opcjonalne")}
                {...register("npcId")}
                disabled={isEditing}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.heroNameLabel", "Nazwa NPC")}
              </Label>
              <Input
                placeholder={t(
                  "events.createDialog.heroNamePlaceholder",
                  "np. Król Goblinów"
                )}
                {...register("npcName", { required: true })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-start gap-2 py-2.5 px-3 rounded-lg border border-dashed bg-muted/20">
              <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.heroes.mapsHint",
                  "Mapy dla herosa dodasz po jego utworzeniu."
                )}
              </p>
            </div>
          )}
        </form>

        <div className="px-5 py-3 border-t bg-muted/30 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t("events.createDialog.cancel", "Anuluj")}
          </Button>
          <Button
            type="submit"
            form="hero-manage-form"
            size="sm"
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                {t("common.saving", "Zapisywanie...")}
              </>
            ) : isEditing ? (
              <>
                <Pencil className="size-3.5 mr-1.5" />
                {t("common.save", "Zapisz")}
              </>
            ) : (
              <>
                <Plus className="size-3.5 mr-1.5" />
                {t("events.createDialog.addHero", "Dodaj herosa")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
