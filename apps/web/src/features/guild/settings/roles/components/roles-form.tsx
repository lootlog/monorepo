import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Settings } from "lucide-react";
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
    defaultValues: {
      lvlRangeFrom: role.lvlRangeFrom?.toString() ?? DEFAULT_LVL_RANGE_FROM,
      lvlRangeTo: role.lvlRangeTo?.toString() ?? DEFAULT_LVL_RANGE_TO,
      permissions: Object.fromEntries(
        PERMISSIONS.map((permission) => [
          permission,
          role.permissions.includes(permission),
        ]),
      ),
    },
  });

  useEffect(() => {
    form.reset({
      lvlRangeFrom: role.lvlRangeFrom?.toString() ?? DEFAULT_LVL_RANGE_FROM,
      lvlRangeTo: role.lvlRangeTo?.toString() ?? DEFAULT_LVL_RANGE_TO,
      permissions: Object.fromEntries(
        PERMISSIONS.map((permission) => [
          permission,
          role.permissions.includes(permission),
        ]),
      ),
    });
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
          form.reset({
            lvlRangeFrom:
              response.lvlRangeFrom?.toString() ?? DEFAULT_LVL_RANGE_FROM,
            lvlRangeTo: response.lvlRangeTo?.toString() ?? DEFAULT_LVL_RANGE_TO,
            permissions: Object.fromEntries(
              PERMISSIONS.map((permission) => [
                permission,
                response.permissions.includes(permission),
              ]),
            ),
          });
        },
        onError: () => {
          toast.error(t("settings.roles.updateError"));
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
        noValidate
      >
        <SectionCard>
          <SectionCardHeader
            title={t("settings.roles.levelRangeTitle")}
            description={t("settings.roles.levelRangeDescription")}
            icon={Settings}
          />
          <SectionCardContent>
            <div className="flex gap-3 items-center ">
              <FormField
                control={form.control}
                name="lvlRangeFrom"
                render={({ field }) => (
                  <FormItem className="flex-1 max-w-[100px]">
                    <FormControl
                      render=<Input
                        placeholder={DEFAULT_LVL_RANGE_FROM}
                        aria-label={t("settings.roles.levelRangeFrom")}
                        type="number"
                        max={500}
                        min={0}
                        className="h-9"
                        {...field}
                      />
                    />
                    <FormMessage role="alert" />
                  </FormItem>
                )}
              />
              <span className="text-muted-foreground">-</span>
              <FormField
                control={form.control}
                name="lvlRangeTo"
                render={({ field }) => (
                  <FormItem className="flex-1 max-w-[100px]">
                    <FormControl
                      render=<Input
                        placeholder={DEFAULT_LVL_RANGE_TO}
                        aria-label={t("settings.roles.levelRangeTo")}
                        type="number"
                        max={500}
                        min={0}
                        className="h-9"
                        {...field}
                      />
                    />
                    <FormMessage role="alert" />
                  </FormItem>
                )}
              />
            </div>
          </SectionCardContent>
        </SectionCard>

        <div className="space-y-3 pt-3">
          <Accordion
            multiple
            defaultValue={PERMISSION_CATEGORIES.map((g) => g.groupKey)}
            className="space-y-3"
          >
            {PERMISSION_CATEGORIES.map((group) => {
              const IconComponent = group.icon;

              const enabledCount = group.permissions.filter((p) =>
                form.watch(`permissions.${p}`),
              ).length;

              return (
                <SectionCard key={group.groupKey} className="overflow-hidden">
                  <AccordionItem value={group.groupKey} className="border-0">
                    <SectionCardHeader
                      icon={IconComponent}
                      title={
                        <AccordionTrigger className="p-0 hover:no-underline">
                          {t(`permissions.groups.${group.groupKey}.name`)}
                        </AccordionTrigger>
                      }
                      description={t(
                        `permissions.groups.${group.groupKey}.description`,
                      )}
                      actions={
                        <span className="text-xs text-muted-foreground">
                          {enabledCount}/{group.permissions.length}
                        </span>
                      }
                    />
                    <AccordionContent className="pb-0 pt-0">
                      <div className="divide-y divide-border/50 border-t border-border/50">
                        {group.permissions.map((perm) => (
                          <FormField
                            key={perm}
                            control={form.control}
                            name={`permissions.${perm}`}
                            render={({ field }) => (
                              <FormItem
                                className={cn(
                                  "relative flex flex-row items-start space-x-3 space-y-0 py-3 px-4 pl-6 items-center",
                                  "transition-colors hover:bg-muted/20",
                                  field.value && "bg-primary/5",
                                )}
                              >
                                <FormControl
                                  render=<Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                />
                                <div className="space-y-0.5 leading-none flex-1">
                                  <FormLabel className="text-sm font-medium cursor-pointer after:absolute after:inset-0">
                                    {t(`permissions.${perm}`)}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {t(`permissions.descriptions.${perm}`)}
                                  </FormDescription>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </SectionCard>
              );
            })}
          </Accordion>
        </div>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={isPending}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
