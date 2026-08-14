import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Clock, ListChecks, TimerReset } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  invalidateGuildsControllerGetGuildById,
  useGuildsControllerUpdateGuildConfig,
} from "@lootlog/api-client/react-query/main/guilds";
import {
  reservationsSettingsFormSchema,
  type ReservationsSettingsFormValues,
} from "./reservations-form.schema";
import {
  getReservationSettings,
  RESERVATION_GRANULARITY_OPTIONS,
} from "@/features/guild/reservations/schedule/reservation-settings";
import type { GuildResponseDtoOutput } from "@lootlog/api-client/models/main/guild-response-dto-output";

type ReservationsSettingsFormProps = {
  guild: GuildResponseDtoOutput;
};

export const ReservationsSettingsForm = ({
  guild,
}: ReservationsSettingsFormProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { mutate: updateGuildConfig } = useGuildsControllerUpdateGuildConfig();
  const settings = getReservationSettings(guild);

  const form = useForm<ReservationsSettingsFormValues>({
    resolver: zodResolver(reservationsSettingsFormSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    form.reset(getReservationSettings(guild));
  }, [
    form,
    guild.reservationActiveLimitPerSpot,
    guild.reservationMaxAdvanceDays,
    guild.reservationMaxDurationMinutes,
    guild.reservationMinDurationMinutes,
    guild.reservationTimeGranularityMinutes,
  ]);

  function onSubmit(values: ReservationsSettingsFormValues) {
    updateGuildConfig(
      {
        pathParams: { guildId: guildId ?? "" },
        data: values,
      },
      {
        onSuccess: async (data) => {
          if (guildId) {
            queryClient.setQueryData(
              getGuildsControllerGetGuildByIdQueryKey({ guildId }),
              data,
            );
            await invalidateGuildsControllerGetGuildById(queryClient, {
              guildId,
            });
          }
          toast.success(t("settings.reservations.toasts.updateSuccess"));
          form.reset(values);
        },
        onError: () => {
          toast.error(t("settings.reservations.toasts.updateError"));
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
      >
        <div className="p-3">
          <Card className="bg-card  border-border p-0 gap-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TimerReset className="size-4 text-primary" />
                </div>
                <div>
                  <FormLabel className="text-sm font-semibold">
                    {t("settings.reservations.duration.title")}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.reservations.duration.description")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reservationMinDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.reservations.fields.minDuration.label")}
                      </FormLabel>
                      <FormControl
                        render={
                          <Input
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        }
                      />
                      <FormDescription>
                        {t(
                          "settings.reservations.fields.minDuration.description",
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reservationMaxDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.reservations.fields.maxDuration.label")}
                      </FormLabel>
                      <FormControl
                        render={
                          <Input
                            type="number"
                            min={30}
                            max={720}
                            step={5}
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        }
                      />
                      <FormDescription>
                        {t(
                          "settings.reservations.fields.maxDuration.description",
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="px-3 pb-3">
          <Card className="bg-card  border-border p-0 gap-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="size-4 text-blue-500" />
                </div>
                <div>
                  <FormLabel className="text-sm font-semibold">
                    {t("settings.reservations.schedule.title")}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.reservations.schedule.description")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reservationTimeGranularityMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.reservations.fields.granularity.label")}
                      </FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                        items={[
                          ...RESERVATION_GRANULARITY_OPTIONS.map((value) => ({
                            value: String(value),
                            label: (
                              <>
                                {t(
                                  "settings.reservations.fields.granularity.option",
                                  { minutes: value },
                                )}
                              </>
                            ),
                          })),
                        ]}
                      >
                        <FormControl
                          render={
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          }
                        />
                        <SelectContent>
                          {RESERVATION_GRANULARITY_OPTIONS.map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {t(
                                "settings.reservations.fields.granularity.option",
                                { minutes: value },
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t(
                          "settings.reservations.fields.granularity.description",
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reservationMaxAdvanceDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.reservations.fields.maxAdvance.label")}
                      </FormLabel>
                      <FormControl
                        render={
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            step={1}
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        }
                      />
                      <FormDescription>
                        {t(
                          "settings.reservations.fields.maxAdvance.description",
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="px-3 pb-3">
          <Card className="bg-card  border-border p-0 gap-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ListChecks className="size-4 text-amber-500" />
                </div>
                <div>
                  <FormLabel className="text-sm font-semibold">
                    {t("settings.reservations.limits.title")}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.reservations.limits.description")}
                  </p>
                </div>
              </div>

              <div className="max-w-md">
                <FormField
                  control={form.control}
                  name="reservationActiveLimitPerSpot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.reservations.fields.activeLimit.label")}
                      </FormLabel>
                      <FormControl
                        render={
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step={1}
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        }
                      />
                      <FormDescription>
                        {t(
                          "settings.reservations.fields.activeLimit.description",
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
