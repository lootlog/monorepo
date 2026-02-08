import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { useCreatePartyGathering } from "@/hooks/api/use-create-party-gathering";
import { useSilentCancelPartyGathering } from "@/hooks/api/use-silent-cancel-party-gathering";
import {
  useSendChatMessage,
  MessageType,
} from "@/hooks/api/use-send-chat-message";
import { useSession } from "@/hooks/auth/use-session";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Game } from "@/lib/game";
import axios from "axios";

const FormSchema = z
  .object({
    description: z.string().max(200).optional(),
    minLvl: z.coerce.number().min(1).max(500).optional().or(z.literal("")),
    maxLvl: z.coerce.number().min(1).max(500).optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.minLvl && data.maxLvl) {
        return Number(data.minLvl) <= Number(data.maxLvl);
      }
      return true;
    },
    {
      message: "Min lvl nie może być większy niż max lvl",
      path: ["minLvl"],
    },
  );

type FormData = z.infer<typeof FormSchema>;

export const CreatePartyGatheringForm = () => {
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const { mutate: createPartyGathering, isPending } = useCreatePartyGathering();
  const silentCancel = useSilentCancelPartyGathering();
  const { mutateAsync: sendChatMessage } = useSendChatMessage();
  const setPartyGathering = usePartyFinderStore((s) => s.setPartyGathering);
  const setChatMessageId = usePartyFinderStore((s) => s.setChatMessageId);
  const { setOpen } = useWindowsStore();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema) as never,
    defaultValues: {
      description: "",
      minLvl: "",
      maxLvl: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (selectedGuildIds.length === 0) {
      window.message("Wybierz przynajmniej jedną gildię");
      return;
    }

    await silentCancel();

    const hero = Game.hero;
    const world = Game.getWorldName();

    createPartyGathering(
      {
        guildIds: selectedGuildIds,
        description: data.description || undefined,
        minLvl: data.minLvl ? Number(data.minLvl) : undefined,
        maxLvl: data.maxLvl ? Number(data.maxLvl) : undefined,
      },
      {
        onSuccess: async (response) => {
          const notificationId = response.data.notificationId;
          const guildIds = response.data.guildIds ?? selectedGuildIds;

          setPartyGathering({
            notificationId,
            discordId: discordId || "",
            character: {
              nick: hero.nick,
              lvl: hero.lvl,
              prof: hero.prof,
              characterId: String(hero.id),
              accountId: String(hero.account),
              icon: hero.img,
              clan: hero.clan
                ? { id: hero.clan.id, name: hero.clan.name }
                : undefined,
            },
            description: data.description || undefined,
            minLvl: data.minLvl ? Number(data.minLvl) : undefined,
            maxLvl: data.maxLvl ? Number(data.maxLvl) : undefined,
            world,
            createdAt: new Date().toISOString(),
            guildIds,
          });

          const chatResults = await sendChatMessage({
            message: hero.nick,
            guildIds,
            type: MessageType.PARTY_GATHERING,
            characterData: {
              nick: hero.nick,
              id: hero.id,
              acc: hero.account,
              lvl: hero.lvl,
              prof: hero.prof,
              icon: hero.img,
            },
            partyGathering: {
              notificationId,
              discordId: discordId || "",
              description: data.description || undefined,
              minLvl: data.minLvl ? Number(data.minLvl) : undefined,
              maxLvl: data.maxLvl ? Number(data.maxLvl) : undefined,
              world,
            },
          });

          chatResults.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value?.data?.id) {
              setChatMessageId(guildIds[index], result.value.data.id);
            }
          });

          setOpen("create-party-gathering", false);
          setOpen("party-finder", true);
          reset();
        },
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 403) {
              window.message("Brak uprawnień do wysyłania ogłoszeń");
            } else if (status === 429) {
              window.message("Zbyt wiele prób. Spróbuj za chwilę.");
            } else if (status === 400) {
              window.message(
                error.response?.data?.message || "Nieprawidłowe dane",
              );
            } else {
              window.message("Nie udało się utworzyć ogłoszenia");
            }
          } else {
            window.message("Nie udało się utworzyć ogłoszenia");
          }
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:flex-col ll:gap-2 ll:p-1"
    >
      <GuildMultiSelector
        value={selectedGuildIds}
        onChange={setSelectedGuildIds}
      />

      <div>
        <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
          Opis (opcjonalny)
        </label>
        <Input
          {...register("description")}
          placeholder="Np. szukam heala na tytana"
          maxLength={200}
        />
        {errors.description && (
          <span className="ll:text-[10px] ll:text-red-400">
            {errors.description.message}
          </span>
        )}
      </div>

      <div className="ll:flex ll:gap-2">
        <div className="ll:flex-1">
          <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
            Min lvl
          </label>
          <Input
            {...register("minLvl")}
            type="number"
            min={1}
            max={500}
            placeholder="1"
          />
        </div>
        <div className="ll:flex-1">
          <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
            Max lvl
          </label>
          <Input
            {...register("maxLvl")}
            type="number"
            min={1}
            max={500}
            placeholder="500"
          />
        </div>
      </div>
      {errors.minLvl && (
        <span className="ll:text-[10px] ll:text-red-400">
          {errors.minLvl.message}
        </span>
      )}

      <Button type="submit" disabled={isPending} className="ll:mt-2">
        {isPending ? "Wysyłanie..." : "Szukaj grupy"}
      </Button>
    </form>
  );
};
