import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@lootlog/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { LootlogConfigNpc } from "@/hooks/api/use-guild-lootlog-settings";
import { ItemRarity } from "@/hooks/api/use-loots";
import { cn } from "@/utils/cn";
import { useUpdateGuildLootlogNpc } from "@/hooks/api/use-update-guild-lootlog-npc";
import { useToast } from "@/components/ui/use-toast";

type NpcSettingsFormProps = {
  npc: LootlogConfigNpc;
};

const formSchema = z.object({
  LEGENDARY: z.boolean().default(true),
  UPGRADED: z.boolean().default(true),
  HEROIC: z.boolean().default(true),
  UNIQUE: z.boolean().default(true),
});

export const NpcSettingsForm: FC<NpcSettingsFormProps> = ({ npc }) => {
  const { toast } = useToast();
  const { mutate: updateGuildLootlogNpc } = useUpdateGuildLootlogNpc();

  const { t } = useTranslation();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      LEGENDARY: npc.allowedRarities.includes(ItemRarity.LEGENDARY),
      UPGRADED: npc.allowedRarities.includes(ItemRarity.UPGRADED),
      HEROIC: npc.allowedRarities.includes(ItemRarity.HEROIC),
      UNIQUE: npc.allowedRarities.includes(ItemRarity.UNIQUE),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateGuildLootlogNpc(
      {
        allowedRarities: Object.keys(values).filter(
          (key) => values[key as keyof typeof values]
        ) as ItemRarity[],
        npcId: npc.id,
      },
      {
        onSuccess: () => {
          toast({
            variant: "default",
            description: "Zaktualizowano ustawienia",
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

  const getRarityCn = (rarity: ItemRarity) => {
    return cn({
      "text-amber-700": rarity === "LEGENDARY",
      "text-blue-500": rarity === "HEROIC",
      "text-amber-300": rarity === "UNIQUE",
      "text-pink-700": rarity === "UPGRADED",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name={ItemRarity.LEGENDARY}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-b p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={getRarityCn(ItemRarity.LEGENDARY)}>
                  {t(`itemRarity.${ItemRarity.LEGENDARY}`)}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={ItemRarity.UPGRADED}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-b p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={getRarityCn(ItemRarity.UPGRADED)}>
                  {t(`itemRarity.${ItemRarity.UPGRADED}`)}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={ItemRarity.HEROIC}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-b p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={getRarityCn(ItemRarity.HEROIC)}>
                  {t(`itemRarity.${ItemRarity.HEROIC}`)}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={ItemRarity.UNIQUE}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-b p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={getRarityCn(ItemRarity.UNIQUE)}>
                  {t(`itemRarity.${ItemRarity.UNIQUE}`)}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

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
