import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Label } from "@lootlog/ui/components/label";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import {
  KeyRound,
  Shield,
  Package,
  Clock,
  CalendarCheck,
  MessageCircle,
  Bell,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { Card } from "@lootlog/ui/components/card";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateRolesControllerGetGuildRoles,
  useRolesControllerUpdateGuildRole,
} from "@/lib/api/generated/main/roles/roles";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";

const PERMISSION_GROUPS = [
  {
    groupKey: "access",
    icon: KeyRound,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    permissions: [Permission.LOOTLOG_ACCESS],
  },
  {
    groupKey: "admin",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    permissions: [Permission.ADMIN, Permission.LOOTLOG_MANAGE],
  },
  {
    groupKey: "loots",
    icon: Package,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    permissions: [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_WRITE,
      Permission.LOOTLOG_LOOTS_TITANS_READ,
      Permission.LOOTLOG_LOOTS_HEROES_READ,
    ],
  },
  {
    groupKey: "timers",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    permissions: [
      Permission.LOOTLOG_TIMERS_READ,
      Permission.LOOTLOG_TIMERS_WRITE,
      Permission.LOOTLOG_TIMERS_RESET,
      Permission.LOOTLOG_TIMERS_DELETE,
      Permission.LOOTLOG_TIMERS_TITANS_READ,
      Permission.LOOTLOG_TIMERS_HEROES_READ,
    ],
  },
  {
    groupKey: "reservations",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    permissions: [
      Permission.LOOTLOG_RESERVATIONS_READ,
      Permission.LOOTLOG_RESERVATIONS_WRITE,
    ],
  },
  {
    groupKey: "members",
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    permissions: [
      Permission.LOOTLOG_MEMBERS_READ,
      Permission.LOOTLOG_ONLINE_PLAYERS_READ,
    ],
  },

  {
    groupKey: "chat",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    permissions: [
      Permission.LOOTLOG_CHAT_READ,
      Permission.LOOTLOG_CHAT_WRITE,
      Permission.LOOTLOG_CHAT_TITANS_READ,
      Permission.LOOTLOG_CHAT_HEROES_READ,
    ],
  },
  {
    groupKey: "notifications",
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    permissions: [
      Permission.LOOTLOG_NOTIFICATIONS_READ,
      Permission.LOOTLOG_NOTIFICATIONS_SEND,
      Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
      Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    ],
  },
  {
    groupKey: "events",
    icon: Trophy,
    color: "text-fuchsia-500",
    bgColor: "bg-fuchsia-500/10",
    permissions: [
      Permission.LOOTLOG_EVENTS_READ,
      Permission.LOOTLOG_EVENTS_WRITE,
      Permission.LOOTLOG_EVENTS_MANAGE,
    ],
  },
];

// Flatten for form schema and submission
const PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

const DEFAULT_LVL_RANGE_FROM = "0";
const DEFAULT_LVL_RANGE_TO = "500";

const formSchema = z.object({
  lvlRangeFrom: z
    .string()
    .min(0)
    .max(500)
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num)) return DEFAULT_LVL_RANGE_FROM;
      if (num > 500) return DEFAULT_LVL_RANGE_TO;
      if (num < 0) return DEFAULT_LVL_RANGE_FROM;
      return String(num);
    }),
  lvlRangeTo: z
    .string()
    .min(0)
    .max(500)
    .transform((val) => {
      const num = Number(val);
      if (Number.isNaN(num)) return DEFAULT_LVL_RANGE_FROM;
      if (num > 500) return DEFAULT_LVL_RANGE_TO;
      if (num < 0) return DEFAULT_LVL_RANGE_FROM;
      return String(num);
    }),
  ...PERMISSIONS.reduce(
    (acc, p) => {
      acc[p] = z.boolean();
      return acc;
    },
    {} as Record<string, z.ZodTypeAny>,
  ),
});

type FormSchemaType = z.infer<typeof formSchema>;

type RolesFormProps = {
  role: GuildRole;
};

export const RolesForm: FC<RolesFormProps> = ({ role }) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { mutate: updateGuildRole } = useRolesControllerUpdateGuildRole();
  const { t } = useTranslation();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lvlRangeFrom: role.lvlRangeFrom?.toString() || DEFAULT_LVL_RANGE_FROM,
      lvlRangeTo: role.lvlRangeTo?.toString() || DEFAULT_LVL_RANGE_TO,
      ...PERMISSIONS.reduce(
        (acc, p) => ({
          ...acc,
          [p]: !!role.permissions.includes(p),
        }),
        {} as Record<Permission, boolean>,
      ),
    },
  });

  useEffect(() => {
    form.reset({
      lvlRangeFrom: role.lvlRangeFrom?.toString() || DEFAULT_LVL_RANGE_FROM,
      lvlRangeTo: role.lvlRangeTo?.toString() || DEFAULT_LVL_RANGE_TO,
      ...PERMISSIONS.reduce(
        (acc, p) => ({
          ...acc,
          [p]: !!role.permissions.includes(p),
        }),
        {} as Record<Permission, boolean>,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function onSubmit(values: FormSchemaType) {
    updateGuildRole(
      {
        pathParams: { guildId: guildId ?? "", roleId: role.id },
        data: {
          permissions: PERMISSIONS.filter(
            (p) =>
              values[
                p as unknown as keyof FormSchemaType
              ] as unknown as boolean,
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
          toast.success("Zaktualizowano ustawienia");
          form.reset({
            lvlRangeFrom:
              response.lvlRangeFrom?.toString() || DEFAULT_LVL_RANGE_FROM,
            lvlRangeTo: response.lvlRangeTo?.toString() || DEFAULT_LVL_RANGE_TO,
            ...PERMISSIONS.reduce(
              (acc, p) => ({
                ...acc,
                [p]: response.permissions.includes(p),
              }),
              {} as Record<Permission, boolean>,
            ),
          });
        },
        onError: () => {
          toast.error("Nie udało się zaktualizować ustawień");
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
          <Card className="bg-card/50 backdrop-blur-sm border-border p-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="size-4 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    Przedział levelowy
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ogranicza widoczność danych do określonego zakresu poziomów
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center ml-11">
                <FormField
                  control={form.control}
                  name="lvlRangeFrom"
                  render={({ field }) => (
                    <FormItem className="flex-1 max-w-[100px]">
                      <FormControl>
                        <Input
                          placeholder={DEFAULT_LVL_RANGE_FROM}
                          type="number"
                          max={500}
                          min={0}
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">—</span>
                <FormField
                  control={form.control}
                  name="lvlRangeTo"
                  render={({ field }) => (
                    <FormItem className="flex-1 max-w-[100px]">
                      <FormControl>
                        <Input
                          placeholder={DEFAULT_LVL_RANGE_TO}
                          type="number"
                          max={500}
                          min={0}
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="px-3 space-y-3">
          <Accordion
            type="multiple"
            defaultValue={PERMISSION_GROUPS.map((g) => g.groupKey)}
            className="space-y-3"
          >
            {PERMISSION_GROUPS.map((group) => {
              const IconComponent = group.icon;
              const enabledCount = group.permissions.filter((p) =>
                form.watch(p as unknown as keyof FormSchemaType),
              ).length;

              return (
                <Card
                  key={group.groupKey}
                  className="bg-card/50 backdrop-blur-sm border-border overflow-hidden p-0"
                >
                  <AccordionItem value={group.groupKey} className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn("p-2 rounded-lg", group.bgColor)}>
                          <IconComponent
                            className={cn("size-4", group.color)}
                          />
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {t(`permissions.groups.${group.groupKey}.name`)}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {enabledCount}/{group.permissions.length}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-normal">
                            {t(
                              `permissions.groups.${group.groupKey}.description`,
                            )}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0 pt-0">
                      <div className="divide-y divide-border/50 border-t border-border/50">
                        {group.permissions.map((perm) => (
                          <FormField
                            key={perm}
                            control={form.control}
                            name={perm as unknown as keyof FormSchemaType}
                            render={({ field }) => (
                              <FormItem
                                className={cn(
                                  "relative flex flex-row items-start space-x-3 space-y-0 py-3 px-4 pl-6 items-center",
                                  "transition-colors hover:bg-muted/20",
                                  field.value && "bg-primary/5",
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
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
                </Card>
              );
            })}
          </Accordion>
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
