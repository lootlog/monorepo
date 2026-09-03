import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { Swords, Plus, Pencil, Info } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { toast } from "sonner";
import {
  useEventsAssignmentControllerAddHero,
  useEventsAssignmentControllerUpdateHero,
} from "@lootlog/client/main";
import { invalidateEventDetailQueries } from "../../hooks/mutations/invalidate-event-queries";
import { getApiErrorMessage } from "../../utils/get-api-error-message";

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
  const queryClient = useQueryClient();
  const addHero = useEventsAssignmentControllerAddHero({
    mutation: {
      onSuccess: () => {
        invalidateEventDetailQueries(queryClient, guildId, eventId);
      },
    },
  });
  const updateHero = useEventsAssignmentControllerUpdateHero({
    mutation: {
      onSuccess: () => {
        invalidateEventDetailQueries(queryClient, guildId, eventId);
      },
    },
  });
  const isEditing = !!hero;
  // @TODO - temprorarily enable hero name editing
  // const isHeroNameLocked = isEditing && hero?.npcId !== null;
  const isHeroNameLocked = false;
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
        const updatedNpcId = data.npcId ? Number(data.npcId) : undefined;
        await updateHero.mutateAsync({
          pathParams: {
            guildId,
            eventId,
            heroId: hero.id,
          },
          data: {
            npcName: data.npcName,
            ...(updatedNpcId !== undefined && { npcId: updatedNpcId }),
          },
        });
        toast.success(t("events.heroes.updated"));
      } else {
        const npcIdNum = data.npcId ? Number(data.npcId) : undefined;
        await addHero.mutateAsync({
          pathParams: {
            guildId,
            eventId,
          },
          data: {
            ...(npcIdNum ? { npcId: npcIdNum } : {}),
            npcName: data.npcName,
          },
        });
        toast.success(t("events.heroes.added"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) === "EVENT_HERO_NAME_LOCKED"
          ? t("events.heroes.nameLockedError")
          : t("common.error"),
      );
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
                {isEditing ? t("events.heroes.edit") : t("events.heroes.add")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEditing ? hero?.npcName : t("events.heroes.addDescription")}
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
                {t("events.createDialog.heroIdLabel")}
              </Label>
              <Input
                type="number"
                placeholder={t("events.createDialog.heroIdPlaceholder")}
                {...register("npcId")}
                disabled={false}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.heroNameLabel")}
              </Label>
              <Input
                placeholder={t("events.createDialog.heroNamePlaceholder")}
                {...register("npcName", { required: true })}
                disabled={isHeroNameLocked}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {isHeroNameLocked && (
            <div className="flex items-start gap-2 py-2.5 px-3 rounded-lg border border-dashed bg-muted/20">
              <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("events.heroes.nameLockedHint")}</p>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex items-start gap-2 py-2.5 px-3 rounded-lg border border-dashed bg-muted/20">
              <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <Trans
                    i18nKey="events.heroes.nameHint"
                    defaults="Nazwa musi być <strong>dokładnie</strong> taka sama jak w grze."
                    components={{
                      strong: (
                        <strong className="font-semibold text-foreground" />
                      ),
                    }}
                  />
                </p>
                <p>{t("events.heroes.idHint")}</p>
                <p>{t("events.heroes.mapsHint")}</p>
              </div>
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
            {t("events.createDialog.cancel")}
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
                <Spinner className="size-3.5 mr-1.5" />
                {t("common.saving")}
              </>
            ) : isEditing ? (
              <>
                <Pencil className="size-3.5 mr-1.5" />
                {t("common.save")}
              </>
            ) : (
              <>
                <Plus className="size-3.5 mr-1.5" />
                {t("events.createDialog.addHero")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
