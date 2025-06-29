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
} from "@/components/ui/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { GuildRole } from "@/hooks/api/use-guild-roles";
import { useUpdateGuildRole } from "@/hooks/api/use-update-guild-role";
import { Permission } from "@/hooks/api/use-guild-permissions";
import { cn } from "@/utils/cn";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@/components/ui/label";

const PERMISSIONS = [
  {
    key: Permission.ADMIN,
    description: "Pozwala zarządzać całym lootlogiem np. nadawanie uprawnień",
    border: true,
  },
  {
    key: Permission.LOOTLOG_MANAGE,
    description: "Pozwala zarządzać lootlogiem np. usuwanie lub edycja lootów",
    border: true,
  },
  {
    key: Permission.LOOTLOG_READ,
    description: "Pozwala na dostęp do lootloga i przeglądanie go",
    border: true,
  },
  {
    key: Permission.LOOTLOG_WRITE,
    description: "Pozwala na zapisywanie lootów i timerów w lootlogu",
    border: true,
  },
  {
    key: Permission.LOOTLOG_READ_LOOTS_TITANS,
    description: "Dostęp do lootów tytanów",
    border: true,
  },
  {
    key: Permission.LOOTLOG_READ_TIMERS_TITANS,
    description: "Dostęp do timerów tytanów",
    border: true,
  },
  {
    key: Permission.LOOTLOG_CHAT_READ,
    description: "Pozwala na czytanie wiadomości z lootloga",
    border: true,
  },
  {
    key: Permission.LOOTLOG_CHAT_WRITE,
    description: "Pozwala na pisanie wiadomości do lootloga",
    border: true,
  },
  {
    key: Permission.LOOTLOG_NOTIFICATIONS_SEND,
    description: "Pozwala na wysyłanie powiadomień z lootloga",
    border: true,
  },
  {
    key: Permission.LOOTLOG_NOTIFICATIONS_READ,
    description: "Pozwala na czytanie powiadomień z lootloga",
    border: true,
  },
] as const;

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
      if (isNaN(num)) return DEFAULT_LVL_RANGE_FROM;
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
      if (isNaN(num)) return DEFAULT_LVL_RANGE_FROM;
      if (num > 500) return DEFAULT_LVL_RANGE_TO;
      if (num < 0) return DEFAULT_LVL_RANGE_FROM;
      return String(num);
    }),
  ...PERMISSIONS.reduce((acc, p) => {
    acc[p.key] = z.boolean();
    return acc;
  }, {} as z.ZodRawShape),
});

type FormSchemaType = z.infer<typeof formSchema>;

type RolesSettingsFormProps = {
  role: GuildRole;
};

export const RolesSettingsForm: FC<RolesSettingsFormProps> = ({ role }) => {
  const { toast } = useToast();
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
        {} as Record<PermissionKey, boolean>
      ),
    },
  });

  function onSubmit(values: FormSchemaType) {
    updateGuildRole(
      {
        permissions: PERMISSIONS.filter(
          (p) =>
            values[
              p.key as unknown as keyof FormSchemaType
            ] as unknown as boolean
        ).map((p) => p.key),
        roleId: role.id,
        lvlRangeFrom: Number(values.lvlRangeFrom),
        lvlRangeTo: Number(values.lvlRangeTo),
      },
      {
        onSuccess: (response) => {
          toast({
            variant: "default",
            description: "Zaktualizowano ustawienia",
          });
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
              {} as Record<PermissionKey, boolean>
            ),
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            description: "Nie udało się zaktualizować ustawień",
          });
        },
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
        <div className="px-6 p-2 border-b">
          <Label>Ustawienia dostępów</Label>
        </div>
        {PERMISSIONS.map((perm) => (
          <FormField
            key={perm.key}
            control={form.control}
            name={perm.key as unknown as keyof FormSchemaType}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 px-6 border-b hover:bg-[#181C25]">
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

        <div className="h-28" />
        <div
          className={cn(
            "absolute bottom-2 left-0 md:left-68 px-4 py-2 w-full transition-all",
            {
              "opacity-0 pointer-events-none": !form.formState.isDirty,
            }
          )}
        >
          <div className=" flex justify-between items-center p-4 border rounded-lg bg-background">
            <div className="font-semibold">Masz niezapisane zmiany!</div>
            <div className="flex gap-2">
              <Button type="reset" variant="ghost">
                Resetuj
              </Button>
              <Button type="submit" variant="default">
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
