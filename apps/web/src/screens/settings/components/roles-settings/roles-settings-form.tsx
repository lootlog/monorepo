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
} from "components/ui/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { useTranslation } from "react-i18next";
import { useDisclosure } from "hooks/use-disclosure";
import { useToast } from "components/ui/use-toast";
import { GuildRole } from "hooks/api/use-guild-roles";
import { useUpdateGuildRole } from "hooks/api/use-update-guild-role";
import { Permission } from "hooks/api/use-guild-permissions";

type RolesSettingsFormProps = {
  role: GuildRole;
};

const formSchema = z.object({
  ADMIN: z.boolean().default(true),
  LOOTLOG_MANAGE: z.boolean().default(true),
  LOOTLOG_READ: z.boolean().default(true),
  LOOTLOG_WRITE: z.boolean().default(true),
  LOOTLOG_READ_LOOTS_TITANS: z.boolean().default(true),
  LOOTLOG_READ_TIMERS_TITANS: z.boolean().default(true),
  LOOTLOG_CHAT_READ: z.boolean().default(true),
  LOOTLOG_CHAT_WRITE: z.boolean().default(true),
});

export const RolesSettingsForm: FC<RolesSettingsFormProps> = ({ role }) => {
  const { onToggle, isOpen, onClose } = useDisclosure();
  const { toast } = useToast();
  const { mutate: updateGuildRole } = useUpdateGuildRole();

  const { t } = useTranslation();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ADMIN: role.permissions.includes(Permission.ADMIN),
      LOOTLOG_MANAGE: role.permissions.includes(Permission.LOOTLOG_MANAGE),
      LOOTLOG_READ: role.permissions.includes(Permission.LOOTLOG_READ),
      LOOTLOG_WRITE: role.permissions.includes(Permission.LOOTLOG_WRITE),
      LOOTLOG_READ_LOOTS_TITANS: role.permissions.includes(
        Permission.LOOTLOG_READ_LOOTS_TITANS
      ),
      LOOTLOG_READ_TIMERS_TITANS: role.permissions.includes(
        Permission.LOOTLOG_READ_TIMERS_TITANS
      ),
      LOOTLOG_CHAT_READ: role.permissions.includes(
        Permission.LOOTLOG_CHAT_READ
      ),
      LOOTLOG_CHAT_WRITE: role.permissions.includes(
        Permission.LOOTLOG_CHAT_WRITE
      ),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateGuildRole(
      {
        permissions: Object.keys(values).filter(
          (key) => values[key as keyof typeof values]
        ) as Permission[],
        roleId: role.id,
      },
      {
        onSuccess: () => {
          toast({
            variant: "default",
            description: "Zaktualizowano ustawienia",
          });
          onClose();
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
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogTrigger asChild>
        <Button className="h-6" size="sm">
          Edytuj
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Edytuj konfigurację dla roli - {role.name}</DialogTitle>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name={Permission.ADMIN}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.ADMIN}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala zarządzać całym lootlogiem np. nadawanie uprawnień
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_MANAGE}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_MANAGE}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala zarządzać lootlogiem np. usuwanie lub edycja
                      lootów
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_READ}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_READ}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala na dostęp do lootloga i przeglądanie go
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_WRITE}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_WRITE}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala na zapisywanie lootów i timerów w lootlogu
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_READ_LOOTS_TITANS}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_READ_LOOTS_TITANS}`)}
                    </FormLabel>
                    <FormDescription>Dostęp do lootów tytanów</FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_READ_TIMERS_TITANS}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(
                        `permissions.${Permission.LOOTLOG_READ_TIMERS_TITANS}`
                      )}
                    </FormLabel>
                    <FormDescription>Dostęp do timerów tytanów</FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_CHAT_READ}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_CHAT_READ}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala na czytanie wiadomości z lootloga
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={Permission.LOOTLOG_CHAT_WRITE}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t(`permissions.${Permission.LOOTLOG_CHAT_WRITE}`)}
                    </FormLabel>
                    <FormDescription>
                      Pozwala na pisanie wiadomości do lootloga
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="p-0 m-0">
              <Button type="submit">Zapisz</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
