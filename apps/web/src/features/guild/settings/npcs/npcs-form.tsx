import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import type {
  LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc,
  LootlogConfigNpcResponseDtoOutputAllowedRaritiesItem as LootlogConfigNpcAllowedRarity,
  UpdateLootlogConfigNpcDtoAllowedRaritiesItem,
} from "@/lib/api/generated/main/model";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { Card } from "@lootlog/ui/components/card";
import { Crown, Swords, Sparkles, type LucideIcon } from "lucide-react";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateLootlogConfigControllerGetLootlogConfig,
  useLootlogConfigControllerUpdateNpc,
} from "@/lib/api/generated/main/lootlog-config/lootlog-config";

type NpcsFormProps = {
  npc: LootlogConfigNpc;
};

const RARITY_CONFIG: {
  key: LootlogConfigNpcAllowedRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}[] = [
  {
    key: "LEGENDARY",
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    icon: Crown,
  },
  {
    key: "HEROIC",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Swords,
  },
  {
    key: "UNIQUE",
    color: "text-amber-300",
    bgColor: "bg-amber-300/10",
    icon: Sparkles,
  },
];

const formSchema = z.object({
  LEGENDARY: z.boolean(),
  HEROIC: z.boolean(),
  UNIQUE: z.boolean(),
});

export const NpcsForm: FC<NpcsFormProps> = ({ npc }) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { mutate: updateGuildLootlogNpc } =
    useLootlogConfigControllerUpdateNpc();
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      LEGENDARY: npc.allowedRarities.includes("LEGENDARY"),
      HEROIC: npc.allowedRarities.includes("HEROIC"),
      UNIQUE: npc.allowedRarities.includes("UNIQUE"),
    },
  });

  useEffect(() => {
    form.reset({
      LEGENDARY: npc.allowedRarities.includes("LEGENDARY"),
      HEROIC: npc.allowedRarities.includes("HEROIC"),
      UNIQUE: npc.allowedRarities.includes("UNIQUE"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npc]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateGuildLootlogNpc(
      {
        pathParams: { guildId: guildId ?? "", npcId: npc.id.toString() },
        data: {
          allowedRarities: Object.entries(values)
            .filter(([_rarity, isEnabled]) => isEnabled)
            .map(
              ([rarity]) =>
                rarity as UpdateLootlogConfigNpcDtoAllowedRaritiesItem,
            ),
        },
      },
      {
        onSuccess: async () => {
          if (guildId) {
            await invalidateLootlogConfigControllerGetLootlogConfig(
              queryClient,
              { guildId },
            );
          }
          toast.success("Zaktualizowano ustawienia");
          form.reset(values);
        },
        onError: () => {
          toast.error("Nie udało się zaktualizować ustawień");
        },
      },
    );
  }

  const enabledCount = RARITY_CONFIG.filter((r) =>
    form.watch(r.key as keyof z.infer<typeof formSchema>),
  ).length;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
      >
        <div className="p-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden p-0 gap-0">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      Zbierane rzadkości
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {enabledCount}/{RARITY_CONFIG.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wybierz które rzadkości mają być zbierane dla tego potwora
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 divide-y divide-border/50">
              {RARITY_CONFIG.map((rarity) => (
                <FormField
                  key={rarity.key}
                  control={form.control}
                  name={rarity.key as keyof z.infer<typeof formSchema>}
                  render={({ field }) => (
                    <FormItem
                      className={cn(
                        "relative flex flex-row items-center space-x-3 space-y-0 py-3 px-4 pl-6",
                        "transition-colors hover:bg-muted/20",
                        field.value && "bg-primary/5",
                      )}
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn("p-1 rounded", rarity.bgColor)}>
                          <rarity.icon className={cn("size-3", rarity.color)} />
                        </div>
                        <FormLabel
                          className={cn(
                            "text-sm font-medium cursor-pointer after:absolute after:inset-0",
                            rarity.color,
                          )}
                        >
                          {t(`itemRarity.${rarity.key}`)}
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </Card>
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
