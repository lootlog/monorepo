import { BandSection } from "@/components/common/band-section";
import { CheckboxListTile } from "@/components/common/checkbox-list-tile";
import { useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";

import { toast } from "@lootlog/ui/lib/toast";

import { PERMISSION_CATEGORIES } from "../constants/permission-categories";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateRolesControllerGetGuildRoles,
  useRolesControllerUpdateGuildRole,
  type RoleResponseDtoOutput as GuildRole,
} from "@lootlog/client/main";
import {
  createRolesFormSchema,
  type RolesFormInput,
} from "./roles-form.schema";

const PERMISSIONS = PERMISSION_CATEGORIES.flatMap((group) => group.permissions);

const DEFAULT_LVL_RANGE_FROM = "0";

const DEFAULT_LVL_RANGE_TO = "500";

const toRolesFormValues = (role: GuildRole): RolesFormInput => ({
  lvlRangeFrom: role.lvlRangeFrom?.toString() ?? DEFAULT_LVL_RANGE_FROM,
  lvlRangeTo: role.lvlRangeTo?.toString() ?? DEFAULT_LVL_RANGE_TO,
  permissions: Object.fromEntries(
    PERMISSIONS.map((permission) => [
      permission,
      role.permissions.includes(permission),
    ]),
  ),
});

type RolesFormProps = {
  role: GuildRole;
};

export const RolesForm: FC<RolesFormProps> = ({ role }) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const { mutate: updateGuildRole, isPending } =
    useRolesControllerUpdateGuildRole();

  const { t } = useTranslation();

  const form = useForm<RolesFormInput>({
    resolver: standardSchemaResolver(createRolesFormSchema(t), undefined, {
      raw: true,
    }),
    values: toRolesFormValues(role),
    resetOptions: { keepDirtyValues: true },
  });

  const permissionValues = useWatch({
    control: form.control,
    name: "permissions",
  });

  function onSubmit(values: RolesFormInput) {
    if (isPending) return;

    updateGuildRole(
      {
        pathParams: { guildId: guildId ?? "", roleId: role.id },
        data: {
          permissions: PERMISSIONS.filter(
            (permission) => values.permissions[permission],
          ),
          lvlRangeFrom: Number(values.lvlRangeFrom),
          lvlRangeTo: Number(values.lvlRangeTo),
        },
      },
      {
        onSuccess: async (response) => {
          if (guildId) {
            await invalidateRolesControllerGetGuildRoles(queryClient, {
              guildId,
            });
          }

          toast.success(t("settings.roles.updateSuccess"));
          form.reset(toRolesFormValues(response));
        },
        onError: () => {
          toast.error(t("settings.roles.updateError"));
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-24" noValidate>
        <BandSection
          id="role-level-range"
          title={t("settings.roles.levelRangeTitle")}
          description={t("settings.roles.levelRangeDescription")}
        >
          <div className="flex items-start gap-3">
            <FormField
              control={form.control}
              name="lvlRangeFrom"
              render={({ field }) => (
                <FormItem className="w-25">
                  <FormLabel className="sr-only">
                    {t("settings.roles.levelRangeFrom")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      placeholder={DEFAULT_LVL_RANGE_FROM}
                      type="number"
                      max={500}
                      min={0}
                      {...field}
                    />
                  />
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <span className="flex h-9 items-center text-muted-foreground">
              -
            </span>
            <FormField
              control={form.control}
              name="lvlRangeTo"
              render={({ field }) => (
                <FormItem className="w-25">
                  <FormLabel className="sr-only">
                    {t("settings.roles.levelRangeTo")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      placeholder={DEFAULT_LVL_RANGE_TO}
                      type="number"
                      max={500}
                      min={0}
                      {...field}
                    />
                  />
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
          </div>
        </BandSection>

        {PERMISSION_CATEGORIES.map((group) => {
          const enabledCount = group.permissions.filter(
            (permission) => permissionValues[permission],
          ).length;

          return (
            <BandSection
              key={group.groupKey}
              id={`role-permissions-${group.groupKey}`}
              title={t(`permissions.groups.${group.groupKey}.name`)}
              description={t(
                `permissions.groups.${group.groupKey}.description`,
              )}
              count={`${enabledCount}/${group.permissions.length}`}
              tiled
            >
              {group.permissions.map((permission) => (
                <FormField
                  key={permission}
                  control={form.control}
                  name={`permissions.${permission}`}
                  render={({ field }) => (
                    <CheckboxListTile
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <FormLabel className="cursor-pointer text-sm font-medium after:absolute after:inset-0">
                          {t(`permissions.${permission}`)}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t(`permissions.descriptions.${permission}`)}
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </CheckboxListTile>
                  )}
                />
              ))}
            </BandSection>
          );
        })}

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={isPending}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
