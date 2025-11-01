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
} from "@lootlog/ui/components/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import type { LootlogConfigNpc } from "@/hooks/api/guilds/use-guild-lootlog-settings";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { useUpdateGuildLootlogNpc } from "@/hooks/api/guilds/use-update-guild-lootlog-npc";

type NpcSettingsFormProps = {
  npc: LootlogConfigNpc;
};

const formSchema = z.object({
  LEGENDARY: z.boolean(),
  UPGRADED: z.boolean(),
  HEROIC: z.boolean(),
  UNIQUE: z.boolean(),
});

export const NpcSettingsForm: FC<NpcSettingsFormProps> = ({ npc }) => {
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

  useEffect(() => {
    form.reset({
      LEGENDARY: npc.allowedRarities.includes(ItemRarity.LEGENDARY),
      UPGRADED: npc.allowedRarities.includes(ItemRarity.UPGRADED),
      HEROIC: npc.allowedRarities.includes(ItemRarity.HEROIC),
      UNIQUE: npc.allowedRarities.includes(ItemRarity.UNIQUE),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npc]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateGuildLootlogNpc(
      {
        allowedRarities: Object.keys(values).filter(
          (key) => values[key as keyof typeof values],
        ) as ItemRarity[],
        npcId: npc.id,
      },
      {
        onSuccess: () => {
          toast.success("Zaktualizowano ustawienia");
          form.reset(values);
        },
        onError: () => {
          toast.error("Nie udało się zaktualizować ustawień");
        },
      },
    );
  }

  const getRarityCn = (rarity: ItemRarity) =>
    cn({
      "text-amber-700": rarity === ItemRarity.LEGENDARY,
      "text-blue-500": rarity === ItemRarity.HEROIC,
      "text-amber-300": rarity === ItemRarity.UNIQUE,
      "text-pink-700": rarity === ItemRarity.UPGRADED,
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full md:py-2 mx-auto"
      >
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

        {/* Safe area spacer so fixed unsaved bar doesn't cover last item */}
        <div className="h-20 md:h-24" />

        <AnimatePresence>
          {form.formState.isDirty && (
            <motion.div
              key="unsaved-bar"
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
                layoutId="unsaved-bar-inner-npc"
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
