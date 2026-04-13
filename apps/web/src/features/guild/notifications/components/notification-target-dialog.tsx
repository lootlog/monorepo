import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Form,
  FormControl,
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
import { Switch } from "@lootlog/ui/components/switch";
import {
  useCreateGuildNotificationTarget,
  useGuildAvailableNotificationTargets,
  useUpdateGuildNotificationTarget,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { getApiErrorMessage } from "@/lib/api-client/api-client";

const targetFormSchema = (t: (key: string) => string, isCreateMode: boolean) =>
  z
    .object({
      externalId: z.string(),
      displayName: z.string(),
      active: z.boolean(),
    })
    .superRefine((values, context) => {
      if (isCreateMode && values.externalId.trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalId"],
          message: t("settings.notifications.validation.channelRequired"),
        });
      }
    });

type TargetFormValues = z.infer<ReturnType<typeof targetFormSchema>>;

type NotificationTargetDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  target?: GuildNotificationTarget;
  existingTargets: GuildNotificationTarget[];
  onOpenChange: (open: boolean) => void;
  onCreated?: (target: GuildNotificationTarget) => void;
};

export const NotificationTargetDialog = ({
  open,
  mode,
  target,
  existingTargets,
  onOpenChange,
  onCreated,
}: NotificationTargetDialogProps) => {
  const { t } = useTranslation();
  const createTarget = useCreateGuildNotificationTarget();
  const updateTarget = useUpdateGuildNotificationTarget();
  const isCreateMode = mode === "create";
  const { data: availableChannelsResponse, isLoading: isLoadingChannels } =
    useGuildAvailableNotificationTargets(open && isCreateMode);
  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema(t, isCreateMode)),
    defaultValues: {
      externalId: "",
      displayName: "",
      active: true,
    },
  });

  useEffect(() => {
    form.reset({
      externalId: "",
      displayName: target?.displayName ?? "",
      active: target?.active ?? true,
    });
  }, [form, open, target]);

  const existingExternalIds = new Set(
    existingTargets.map((existingTarget) => existingTarget.externalId),
  );

  const availableChannels =
    availableChannelsResponse?.channels.filter(
      (channel) => !existingExternalIds.has(channel.channelId),
    ) ?? [];

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({
        externalId: "",
        displayName: target?.displayName ?? "",
        active: target?.active ?? true,
      });
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (values: TargetFormValues) => {
    const trimmedDisplayName = values.displayName.trim();

    try {
      if (isCreateMode) {
        const createdTarget = await createTarget.mutateAsync({
          externalId: values.externalId,
          displayName:
            trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined,
        });
        toast.success(t("settings.notifications.toasts.targetCreated"));
        onCreated?.(createdTarget);
      } else if (target) {
        await updateTarget.mutateAsync({
          targetId: target.id,
          displayName:
            trimmedDisplayName.length > 0 ? trimmedDisplayName : null,
          active: values.active,
        });
        toast.success(t("settings.notifications.toasts.targetUpdated"));
      }

      handleDialogOpenChange(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t(
            isCreateMode
              ? "settings.notifications.toasts.targetCreateError"
              : "settings.notifications.toasts.targetUpdateError",
          ),
      );
    }
  };

  const isSubmitting = createTarget.isPending || updateTarget.isPending;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/30 px-5 py-4">
          <DialogTitle className="px-0 pt-0 text-base">
            {t(
              isCreateMode
                ? "settings.notifications.targetDialog.createTitle"
                : "settings.notifications.targetDialog.editTitle",
            )}
          </DialogTitle>
          <DialogDescription className="px-0">
            {t(
              isCreateMode
                ? "settings.notifications.targetDialog.createDescription"
                : "settings.notifications.targetDialog.editDescription",
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5 px-5 py-5"
          >
            {isCreateMode ? (
              <FormField
                control={form.control}
                name="externalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.notifications.fields.channel")}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={
                        isLoadingChannels || availableChannels.length === 0
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "settings.notifications.placeholders.channel",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableChannels.map((channel) => (
                          <SelectItem
                            key={channel.channelId}
                            value={channel.channelId}
                          >
                            {channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {isLoadingChannels ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Spinner className="size-3.5" />
                        {t("settings.notifications.loading.availableChannels")}
                      </div>
                    ) : null}
                    {!isLoadingChannels && availableChannels.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("settings.notifications.empty.availableChannels")}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.displayName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        "settings.notifications.placeholders.displayName",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isCreateMode ? (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <div className="flex flex-row items-center justify-between rounded-xl border border-border/70 bg-background/30 px-3 py-3">
                      <div>
                        <FormLabel className="text-sm font-medium">
                          {t("settings.notifications.fields.active")}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {t("settings.notifications.fields.activeDescription")}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    {!field.value && target?.active ? (
                      <p className="text-xs text-amber-500">
                        {t(
                          "settings.notifications.fields.activeDeactivateWarning",
                        )}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("settings.notifications.actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (isCreateMode && availableChannels.length === 0)
                }
              >
                {isSubmitting ? (
                  <Spinner className="size-4" />
                ) : isCreateMode ? (
                  t("settings.notifications.actions.create")
                ) : (
                  t("settings.notifications.actions.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
