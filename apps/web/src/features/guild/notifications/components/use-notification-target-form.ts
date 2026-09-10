import { useGuildId } from "@/hooks/context/use-guild-id";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getNotificationsGuildControllerGetAvailableGuildTargetsQueryKey,
  getNotificationsGuildControllerGetAvailableGuildTargetsQueryOptions,
  useNotificationsGuildControllerCreateGuildTarget,
  useNotificationsGuildControllerGetAvailableGuildTargets,
  useNotificationsGuildControllerUpdateGuildTarget,
  type NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { NotificationTargetType } from "@lootlog/schema/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { invalidateGuildNotificationQueries } from "../notifications-api";

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
  target?: NotificationTargetResponseDto;
  existingTargets: NotificationTargetResponseDto[];
  onOpenChange: (open: boolean) => void;
  onCreated?: (target: NotificationTargetResponseDto) => void;
};

export const useNotificationTargetForm = ({
  open,
  mode,
  target,
  existingTargets,
  onOpenChange,
  onCreated,
}: NotificationTargetDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const createTarget = useNotificationsGuildControllerCreateGuildTarget({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });

  const updateTarget = useNotificationsGuildControllerUpdateGuildTarget({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });

  const isCreateMode = mode === "create";

  const { data: availableChannelsResponse, isLoading: isLoadingChannels } =
    useNotificationsGuildControllerGetAvailableGuildTargets(
      { guildId: guildId ?? "" },
      {
        query:
          getNotificationsGuildControllerGetAvailableGuildTargetsQueryOptions(
            { guildId: guildId ?? "" },
            {
              query: {
                enabled: open && isCreateMode && Boolean(guildId),
                queryKey:
                  getNotificationsGuildControllerGetAvailableGuildTargetsQueryKey(
                    {
                      guildId: guildId ?? "",
                    },
                  ),
              },
            },
          ),
      },
    );

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

    if (!guildId) {
      toast.error(
        t(
          isCreateMode
            ? "settings.notifications.toasts.targetCreateError"
            : "settings.notifications.toasts.targetUpdateError",
        ),
      );

      return;
    }

    try {
      if (isCreateMode) {
        const createdTarget = await createTarget.mutateAsync({
          pathParams: { guildId },
          data: {
            targetType: NotificationTargetType.CHANNEL,
            externalId: values.externalId,
            displayName:
              trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined,
          },
        });

        toast.success(t("settings.notifications.toasts.targetCreated"));
        onCreated?.(createdTarget);
      } else if (target) {
        await updateTarget.mutateAsync({
          pathParams: { guildId, targetId: target.id },
          data: {
            displayName:
              trimmedDisplayName.length > 0 ? trimmedDisplayName : null,
            active: values.active,
          },
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

  return {
    open,
    onOpenChange,
    handleDialogOpenChange,
    t,
    isCreateMode,
    form,
    handleSubmit,
    isLoadingChannels,
    availableChannels,
    target,
    isSubmitting,
  };
};
