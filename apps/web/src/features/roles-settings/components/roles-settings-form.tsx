import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@lootlog/ui/components/button";
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
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { useUpdateGuildRole } from "@/hooks/api/guilds/use-update-guild-role";
import { Permission } from "@lootlog/types";

const PERMISSION_GROUPS = [
  {
    name: "Dostęp",
    description: "Podstawowe uprawnienie wymagane do korzystania z aplikacji",
    permissions: [
      {
        key: Permission.LOOTLOG_ACCESS,
        description:
          "Dostęp do aplikacji - podstawowe uprawnienie wymagane do logowania",
      },
    ],
  },
  {
    name: "Administracja",
    description: "Uprawnienia administracyjne do zarządzania lootlogiem",
    permissions: [
      {
        key: Permission.ADMIN,
        description:
          "Pozwala zarządzać całym lootlogiem np. nadawanie uprawnień",
      },
      {
        key: Permission.LOOTLOG_MANAGE,
        description:
          "Pozwala zarządzać lootlogiem np. usuwanie lub edycja lootów",
      },
    ],
  },
  {
    name: "Łupy",
    description: "Uprawnienia związane z przeglądaniem i zapisywaniem łupów",
    permissions: [
      {
        key: Permission.LOOTLOG_LOOTS_READ,
        description: "Pozwala na przeglądanie lootów i komentarzy",
      },
      {
        key: Permission.LOOTLOG_LOOTS_WRITE,
        description: "Pozwala na zapisywanie lootów w lootlogu",
      },
      {
        key: Permission.LOOTLOG_LOOTS_TITANS_READ,
        description: "Dostęp do lootów tytanów",
      },
      {
        key: Permission.LOOTLOG_LOOTS_HEROES_READ,
        description: "Dostęp do lootów herosów",
      },
    ],
  },
  {
    name: "Timery",
    description: "Uprawnienia związane z timerami bossów",
    permissions: [
      {
        key: Permission.LOOTLOG_TIMERS_READ,
        description: "Pozwala na przeglądanie timerów bossów",
      },
      {
        key: Permission.LOOTLOG_TIMERS_WRITE,
        description: "Pozwala na zapisywanie timerów w lootlogu",
      },
      {
        key: Permission.LOOTLOG_TIMERS_RESET,
        description: "Pozwala na resetowanie timerów",
      },
      {
        key: Permission.LOOTLOG_TIMERS_DELETE,
        description: "Pozwala na usuwanie timerów",
      },
      {
        key: Permission.LOOTLOG_TIMERS_TITANS_READ,
        description: "Dostęp do timerów tytanów",
      },
      {
        key: Permission.LOOTLOG_TIMERS_HEROES_READ,
        description: "Dostęp do timerów herosów",
      },
    ],
  },
  {
    name: "Rezerwacje",
    description: "Uprawnienia związane z rezerwacjami",
    permissions: [
      {
        key: Permission.LOOTLOG_RESERVATIONS_READ,
        description: "Pozwala na przeglądanie rezerwacji",
      },
      {
        key: Permission.LOOTLOG_RESERVATIONS_WRITE,
        description: "Pozwala na tworzenie i edycję rezerwacji",
      },
    ],
  },
  {
    name: "Członkowie",
    description: "Uprawnienia związane z listą członków gildii",
    permissions: [
      {
        key: Permission.LOOTLOG_MEMBERS_READ,
        description: "Pozwala na przeglądanie listy członków gildii",
      },
    ],
  },
  {
    name: "Czat",
    description: "Uprawnienia związane z czatem lootloga",
    permissions: [
      {
        key: Permission.LOOTLOG_CHAT_READ,
        description: "Pozwala na czytanie wiadomości z lootloga",
      },
      {
        key: Permission.LOOTLOG_CHAT_WRITE,
        description: "Pozwala na pisanie wiadomości do lootloga",
      },
      {
        key: Permission.LOOTLOG_CHAT_TITANS_READ,
        description: "Dostęp do czatu tytanów",
      },
      {
        key: Permission.LOOTLOG_CHAT_HEROES_READ,
        description: "Dostęp do czatu herosów",
      },
    ],
  },
  {
    name: "Powiadomienia",
    description: "Uprawnienia związane z powiadomieniami",
    permissions: [
      {
        key: Permission.LOOTLOG_NOTIFICATIONS_READ,
        description: "Pozwala na czytanie powiadomień z lootloga",
      },
      {
        key: Permission.LOOTLOG_NOTIFICATIONS_SEND,
        description: "Pozwala na wysyłanie powiadomień z lootloga",
      },
      {
        key: Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
        description: "Dostęp do powiadomień o tytanach",
      },
      {
        key: Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
        description: "Dostęp do powiadomień o herosach",
      },
    ],
  },
];

// Flatten for form schema and submission
const PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

const DEFAULT_LVL_RANGE_FROM = "0";
const DEFAULT_LVL_RANGE_TO = "500";

type PermissionKey = (typeof PERMISSIONS)[number]["key"];

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
      acc[p.key] = z.boolean();
      return acc;
    },
    {} as Record<string, z.ZodTypeAny>,
  ),
});

type FormSchemaType = z.infer<typeof formSchema>;

type RolesSettingsFormProps = {
  role: GuildRole;
};

export const RolesSettingsForm: FC<RolesSettingsFormProps> = ({ role }) => {
  const { mutate: updateGuildRole } = useUpdateGuildRole();
  const { t } = useTranslation();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lvlRangeFrom: role.lvlRangeFrom?.toString() || DEFAULT_LVL_RANGE_FROM,
      lvlRangeTo: role.lvlRangeTo?.toString() || DEFAULT_LVL_RANGE_TO,
      ...PERMISSIONS.reduce(
        (acc, p) => ({
          ...acc,
          [p.key]: !!role.permissions.includes(p.key),
        }),
        {} as Record<PermissionKey, boolean>,
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
          [p.key]: !!role.permissions.includes(p.key),
        }),
        {} as Record<PermissionKey, boolean>,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function onSubmit(values: FormSchemaType) {
    updateGuildRole(
      {
        permissions: PERMISSIONS.filter(
          (p) =>
            values[
              p.key as unknown as keyof FormSchemaType
            ] as unknown as boolean,
        ).map((p) => p.key),
        roleId: role.id,
        lvlRangeFrom: Number(values.lvlRangeFrom),
        lvlRangeTo: Number(values.lvlRangeTo),
      },
      {
        onSuccess: (response) => {
          toast.success("Zaktualizowano ustawienia");
          form.reset({
            lvlRangeFrom:
              response.data.lvlRangeFrom?.toString() || DEFAULT_LVL_RANGE_FROM,
            lvlRangeTo:
              response.data.lvlRangeTo?.toString() || DEFAULT_LVL_RANGE_TO,
            ...PERMISSIONS.reduce(
              (acc, p) => ({
                ...acc,
                [p.key]: response.data.permissions.includes(p.key),
              }),
              {} as Record<PermissionKey, boolean>,
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
        className="w-full md:py-2 mx-auto"
      >
        <div className="px-6 p-2 border-b">
          <Label>Ustawienia roli</Label>
        </div>
        <div className="px-6 pt-2">
          <Label>Przedział levelowy</Label>
          <FormDescription>
            Określa przedział levelowy danej roli - przydatne w momencie, gdy na
            jednym serwerze Discord jest kilka klanów. Ustawienie tej opcji
            wyłączy możliwość wyświetlania łupów i timerów spoza przedziału.
          </FormDescription>
        </div>
        <div className="flex px-6 p-4 gap-4 border-b items-center">
          <FormField
            control={form.control}
            name="lvlRangeFrom"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={DEFAULT_LVL_RANGE_FROM}
                    type="number"
                    max={500}
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          -
          <FormField
            control={form.control}
            name="lvlRangeTo"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={DEFAULT_LVL_RANGE_TO}
                    type="number"
                    max={500}
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.name}>
            <div className="px-6 py-3 bg-secondary/50 border-b">
              <Label className="text-sm font-semibold">{group.name}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {group.description}
              </p>
            </div>
            {group.permissions.map((perm) => (
              <FormField
                key={perm.key}
                control={form.control}
                name={perm.key as unknown as keyof FormSchemaType}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 px-6 border-b hover:bg-secondary">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        {t(`permissions.${perm.key}`)}
                      </FormLabel>
                      <FormDescription>{perm.description}</FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        ))}

        <div className="h-20 md:h-24" />

        <AnimatePresence>
          {form.formState.isDirty && (
            <motion.div
              key="unsaved-bar-roles-form"
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 28,
                mass: 0.7,
              }}
              className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-[theme(width.64)] z-50 flex justify-center px-4 pb-3"
            >
              <motion.div
                layout
                layoutId="unsaved-bar-inner-roles-form"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                  mass: 0.6,
                }}
                className="pointer-events-auto w-full max-w-3xl rounded-md border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-md flex items-center justify-between gap-4"
              >
                <p className="text-sm font-medium">Masz niezapisane zmiany</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.reset()}
                  >
                    Resetuj
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Form>
  );
};
