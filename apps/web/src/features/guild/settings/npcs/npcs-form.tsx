import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
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
import type { LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc } from "@lootlog/client/main";
import type { UpdateLootlogConfigNpcDtoAllowedRaritiesItem } from "@lootlog/client/main";
import { cn } from "cn";
import { toast } from "sonner";

import { Sparkles } from "lucide-react";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateLootlogConfigControllerGetLootlogConfig,
  useLootlogConfigControllerUpdateNpc,
} from "@lootlog/client/main";

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
    form.watch(r.key as keyof z.infer<typeof formSchema>),
  ).length;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
      >
        <SectionCard className="overflow-hidden">
          <SectionCardHeader
            icon={Sparkles}
            title={t("settings.npcs.raritiesTitle")}
            description={t("settings.npcs.raritiesDescription")}
            actions={
              <span className="text-xs text-muted-foreground">
                {enabledCount}/{NPC_RARITY_CONFIG.length}
              </span>
            }
          />
          <SectionCardContent className="p-0">
            <div className="border-t border-border/50 divide-y divide-border/50">
              {NPC_RARITY_CONFIG.map((rarity) => (
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
                      <FormControl
                        render={
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        }
                      />
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
          </SectionCardContent>
        </SectionCard>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={isPending}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
