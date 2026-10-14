import { BandSection } from "@/components/common/band-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";

import { toast } from "sonner";
import { cn } from "cn";

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

// Flatten for form schema and submission
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
    resolver: zodResolver(createRolesFormSchema(t), undefined, { raw: true }),
    defaultValues: toRolesFormValues(role),
  });

  useEffect(() => {
    form.reset(toRolesFormValues(role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

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
      {/* Room below the last section for the docked save bar. */}
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
                  <FormControl
                    render=<Input
                      placeholder={DEFAULT_LVL_RANGE_FROM}
                      aria-label={t("settings.roles.levelRangeFrom")}
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
                  <FormControl
                    render=<Input
                      placeholder={DEFAULT_LVL_RANGE_TO}
                      aria-label={t("settings.roles.levelRangeTo")}
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
          const enabledCount = group.permissions.filter((permission) =>
            form.watch(`permissions.${permission}`),
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
                    <FormItem
                      data-list-tile
                      className={cn(
                        "relative flex flex-row items-center gap-3 py-3 transition-colors hover:bg-muted/30 motion-reduce:transition-none",
                        LIST_TILE_RULE_CLASS,
                        LIST_TILE_INSET_CLASS,
                        field.value && "bg-primary/5",
                      )}
                    >
                      <FormControl
                        render=<Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {/* The label covers the tile, so the whole tile toggles. */}
                        <FormLabel className="cursor-pointer text-sm font-medium after:absolute after:inset-0">
                          {t(`permissions.${permission}`)}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t(`permissions.descriptions.${permission}`)}
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
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
