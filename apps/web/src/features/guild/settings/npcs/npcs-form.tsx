import { BandSection } from "@/components/common/band-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
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
import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import {
  type LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc,
  invalidateLootlogConfigControllerGetLootlogConfig,
  useLootlogConfigControllerUpdateNpc,
} from "@lootlog/client/main";

import { cn } from "cn";
import { toast } from "sonner";

import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";

type NpcsFormProps = {
  npc: LootlogConfigNpc;
};

const formSchema = z.object({
  LEGENDARY: z.boolean(),
  HEROIC: z.boolean(),
  UNIQUE: z.boolean(),
});

export const NpcsForm: FC<NpcsFormProps> = ({ npc }) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const { mutate: updateGuildLootlogNpc, isPending } =
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
    if (isPending) return;

    updateGuildLootlogNpc(
      {
        pathParams: { guildId: guildId ?? "", npcId: npc.id.toString() },
        data: {
          allowedRarities: NPC_RARITY_CONFIG.flatMap(({ key }) =>
            values[key] ? [key] : [],
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

          toast.success(t("settings.npcs.updateSuccess"));
          form.reset(values);
        },
        onError: () => {
          toast.error(t("settings.npcs.updateError"));
        },
      },
    );
  }

  const enabledCount = NPC_RARITY_CONFIG.filter((r) =>
    form.watch(r.key),
  ).length;

  return (
    <Form {...form}>
      {/* Room below the last section for the docked save bar. */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-24">
        <BandSection
          id="npc-rarities"
          title={t("settings.npcs.raritiesTitle")}
          description={t("settings.npcs.raritiesDescription")}
          count={`${enabledCount}/${NPC_RARITY_CONFIG.length}`}
          tiled
        >
          {NPC_RARITY_CONFIG.map((rarity) => (
            <FormField
              key={rarity.key}
              control={form.control}
              name={rarity.key}
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  />
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                      rarity.bgColor,
                    )}
                  >
                    <rarity.icon
                      aria-hidden
                      className={cn("size-4", rarity.color)}
                    />
                  </span>
                  {/* The label covers the tile, so the whole tile toggles. */}
                  <FormLabel
                    className={cn(
                      "flex-1 cursor-pointer text-sm font-medium after:absolute after:inset-0",
                      rarity.color,
                    )}
                  >
                    {t(`itemRarity.${rarity.key}`)}
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </BandSection>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={isPending}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
