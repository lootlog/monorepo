import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TFunction } from "i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Textarea } from "@lootlog/ui/components/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { useCreateEvent } from "../../hooks/mutations/use-create-event";
import { toast } from "sonner";
import { Trophy, Loader2, Settings, BookOpenText } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { DEFAULT_EVENT_SCORING_RULES } from "../../types/scoring-rules";
import { normalizeScoringRules } from "../../utils/scoring-rules";
import { ScoringRulesEditor } from "./scoring-rules-editor";

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createScoringSchema = () =>
  z.object({
    baseThresholds: z
      .array(
        z.object({
          percentage: z.number().min(0).max(100),
          points: z.number().min(0),
        }),
      )
      .min(1),
    leaveGraceMinutes: z.number().min(0),
    groupBonus: z.object({
      minAssignedMembers: z.number().min(0),
      maxAssignedMembers: z.number().min(0),
      points: z.number().min(0),
    }),
    nightBonus: z.object({
      windowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      windowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      requiredCoveragePercentage: z.number().min(0).max(100),
      points: z.number().min(0),
    }),
    pvpBonus: z.object({
      windowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      windowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      points: z.number().min(0),
    }),
    hardCapPoints: z.number().min(0),
    timezone: z.string().min(1),
  });

const createFormSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(1, t("events.createDialog.nameRequired")),
      world: z.string().min(1, t("events.createDialog.worldRequired")),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
      participationConfirmationMinutes: z.number().min(0),
      rulebookMarkdown: z.string().max(10_000).optional(),
      scoringRules: createScoringSchema(),
    })
    .refine(
      (data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt,
      {
        message: t("events.createDialog.endDateMustBeAfterStart"),
        path: ["endsAt"],
      },
    )
    .refine(
      (data) =>
        data.scoringRules.groupBonus.maxAssignedMembers >=
        data.scoringRules.groupBonus.minAssignedMembers,
      {
        message: t(
          "events.scoring.groupRangeError",
          "Maksymalna liczba osób musi być większa lub równa minimalnej",
        ),
        path: ["scoringRules", "groupBonus", "maxAssignedMembers"],
      },
    );

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

const getDefaultValues = (): FormData => ({
  name: "",
  world: "",
  startsAt: new Date(),
  endsAt: undefined,
  participationConfirmationMinutes: 0,
  rulebookMarkdown: "",
  scoringRules: normalizeScoringRules(DEFAULT_EVENT_SCORING_RULES),
});

export const EventCreateDialog = ({
  open,
  onOpenChange,
}: EventCreateDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const navigate = useNavigate();
  const { mutate: createEvent, isPending } = useCreateEvent();

  const formSchema = createFormSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const onSubmit = (data: FormData) => {
    createEvent(
      {
        name: data.name.trim(),
        world: data.world.trim(),
        startsAt: data.startsAt?.toISOString(),
        endsAt: data.endsAt?.toISOString(),
        participationConfirmationMinutes: Number.isFinite(
          data.participationConfirmationMinutes,
        )
          ? Math.max(0, Math.round(data.participationConfirmationMinutes))
          : 0,
        rulebookMarkdown: data.rulebookMarkdown?.trim().length
          ? data.rulebookMarkdown.trim()
          : null,
        scoringRules: normalizeScoringRules(data.scoringRules),
      },
      {
        onSuccess: (eventData) => {
          toast.success(t("events.createDialog.success"));
          handleClose(false);
          navigate({ to: `/${guildId}/events/${eventData.id}` });
        },
        onError: () => {
          toast.error(t("events.createDialog.error"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.createDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t("events.createDialog.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-5 space-y-5 overflow-y-auto"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("events.createDialog.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.createDialog.namePlaceholder")}
                      className="h-9 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="world"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("events.createDialog.worldLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.createDialog.worldPlaceholder")}
                      className="h-9 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.createDialog.startsAtLabel")}
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t(
                          "events.createDialog.startsAtPlaceholder",
                        )}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.createDialog.endsAtLabel")}
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("events.createDialog.endsAtPlaceholder")}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("events.createDialog.datesHint")}
            </p>

            <FormField
              control={form.control}
              name="participationConfirmationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t(
                      "events.settings.participationConfirmation",
                      "Potwierdzenie udziału (minuty)",
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onChange={(event) =>
                        field.onChange(
                          Number.isFinite(event.target.valueAsNumber)
                            ? event.target.valueAsNumber
                            : 0,
                        )
                      }
                      className="h-9 text-sm"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "events.settings.participationConfirmationDescription",
                      "Ile minut po biciu gracz ma na potwierdzenie udziału (0 = wyłączone)",
                    )}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <BookOpenText className="size-3" />
                {t("events.rulebook.label", "Regulamin eventu")}
              </FormLabel>
              <Textarea
                {...form.register("rulebookMarkdown")}
                placeholder={t(
                  "events.rulebook.placeholder",
                  "Wpisz regulamin eventu, zasady uczestnictwa i dodatkowe informacje.",
                )}
                className="min-h-[140px] text-sm"
              />
              {form.formState.errors.rulebookMarkdown?.message && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.rulebookMarkdown.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Settings className="size-3" />
                {t("events.scoring.title")}
              </FormLabel>
              <ScoringRulesEditor
                control={form.control}
                register={form.register}
                t={t}
              />
              {form.formState.errors.scoringRules?.groupBonus
                ?.maxAssignedMembers?.message && (
                <p className="text-sm font-medium text-destructive">
                  {
                    form.formState.errors.scoringRules.groupBonus
                      .maxAssignedMembers.message
                  }
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
                className="flex-1"
              >
                {t("events.createDialog.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    {t("events.createDialog.creating")}
                  </>
                ) : (
                  <>
                    <Trophy className="size-3.5 mr-1.5" />
                    {t("events.create")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
