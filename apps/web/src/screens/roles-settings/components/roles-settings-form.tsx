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
];

const formSchema = z.object(
  PERMISSIONS.reduce((acc, p) => {
    acc[p.key] = z.boolean();
    return acc;
  }, {} as z.ZodRawShape)
);

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
    defaultValues: PERMISSIONS.reduce(
      (acc, p) => ({
        ...acc,
        [p.key]: role.permissions.includes(p.key as Permission),
      }),
      {} as Record<string, boolean>
    ),
  });

  function onSubmit(values: FormSchemaType) {
    updateGuildRole(
      {
        permissions: Object.keys(values).filter(
          (key) => values[key as keyof typeof values]
        ) as Permission[],
        roleId: role.id,
      },
      {
        onSuccess: (response) => {
          toast({
            variant: "default",
            description: "Zaktualizowano ustawienia",
          });
          form.reset(
            PERMISSIONS.reduce(
              (acc, p) => ({
                ...acc,
                [p.key]: response.data.permissions.includes(
                  p.key as Permission
                ),
              }),
              {} as Record<string, boolean>
            )
          );
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
        {PERMISSIONS.map((perm) => (
          <FormField
            key={perm.key}
            control={form.control}
            name={perm.key}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 px-6 border-b hover:bg-[#181C25]">
                <FormControl>
                  <Checkbox
                    checked={field.value}
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
