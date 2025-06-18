import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NpcType } from "@/hooks/api/use-npcs";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useGlobalStore } from "@/store/global.store";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import {
  calculateMaxOffsetFromMinOffset,
  calculateRespBaseSecondsFromMinOffset,
  formatSecondsToHHMMSS,
  parseDurationToSeconds,
} from "@/features/timers/helpers/add-timer-form-helpers";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";

const MULTIPLIER_BY_NPC_TYPE: Record<string, number> = {
  [NpcType.ELITE2]: 10,
  [NpcType.HERO]: 50,
  [NpcType.TITAN]: 25,
  none: 0,
};

const SELECT_OPTIONS = [
  { value: "none", label: "Brak (losowość - 0)" },
  {
    value: NpcType.ELITE2,
    label: `E2 (losowość - ${MULTIPLIER_BY_NPC_TYPE[NpcType.ELITE2]})`,
  },
  {
    value: NpcType.HERO,
    label: `Heros (losowość - ${MULTIPLIER_BY_NPC_TYPE[NpcType.HERO]})`,
  },
  {
    value: NpcType.TITAN,
    label: `Tytan (losowość - ${MULTIPLIER_BY_NPC_TYPE[NpcType.TITAN]})`,
  },
];

const schema = z.object({
  name: z.string().min(1).max(20),
  minSpawn: z
    .string()
    .min(1)
    .transform((val) => parseDurationToSeconds(val))
    .refine((val) => val > 0, {
      message: "Duration must be greater than 0 seconds",
    }),
  npcType: z
    .enum([NpcType.ELITE2, NpcType.HERO, NpcType.TITAN, "none"])
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export const AddTimerForm: React.FC = () => {
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const { world } = useGlobalStore((state) => state.gameState);
  const [selectedGuildId] = useLocalStorage(`timers-selected-guild`, "");
  const { setOpen } = useWindowsStore();

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      npcType: "none",
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!world || !selectedGuildId) return;

    const { name, minSpawn, npcType } = data;
    const respawnRandomness = npcType
      ? MULTIPLIER_BY_NPC_TYPE[npcType]
      : DEFAULT_RESPAWN_RANDOMNESS;

    const respBaseSeconds = calculateRespBaseSecondsFromMinOffset(
      minSpawn,
      respawnRandomness
    );

    createManualTimer(
      {
        name,
        respBaseSeconds,
        respawnRandomness,
        world,
        guildId: selectedGuildId,
      },
      {
        onSuccess: () => {
          setOpen("add-timer", false);
        },
      }
    );
  };

  const minSpawn = watch("minSpawn");
  const npcType = watch("npcType");
  const multiplier = npcType
    ? MULTIPLIER_BY_NPC_TYPE[npcType]
    : DEFAULT_RESPAWN_RANDOMNESS;
  const minOffset = parseDurationToSeconds(
    typeof minSpawn === "string" ? minSpawn : String(minSpawn)
  );
  const maxOffset = calculateMaxOffsetFromMinOffset(minOffset, multiplier);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll-space-y-4 ll-box-border ll-mt-2 ll-mx-auto ll-w-[222px]"
    >
      <div className="ll-w-full">
        <Label htmlFor="text">Nazwa</Label>
        <Input
          id="text"
          autoComplete="off"
          placeholder="np. Młody Smok"
          maxLength={20}
          {...register("name")}
        />
      </div>
      <div>
        <Label htmlFor="minSpawn">Minimalny czas respu (max 300h)</Label>
        <Input
          id="minSpawn"
          placeholder="np. 2h 30m 45s"
          autoComplete="off"
          {...register("minSpawn")}
        />
      </div>
      <div>
        <label htmlFor="role" className="ll-font-semibold ll-text-xs">
          Typ potwora
        </label>
        <Select
          defaultValue={"none"}
          onValueChange={(value) => {
            setValue(
              "npcType",
              value as NpcType.ELITE2 | NpcType.HERO | NpcType.TITAN
            );
          }}
        >
          <SelectTrigger className="w-[222px] ll-text-white ll-text-xs ll-border-gray-400 ll-rounded-xs ll-h-4 ll-my-1 ll-mb-2 ll-custom-cursor-pointer">
            <SelectValue
              className="ll-h-4 ll-text-sm ll-text-white"
              placeholder="Wybierz typ potwora..."
            />
          </SelectTrigger>
          <SelectContent className="ll-font-sans ll-z-[500] ll-w-[222px] ll-py-1">
            {SELECT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="ll-text-xs ll-font-semibold ll-w-[210px] ll-h-5"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="ll-space-y-1 ll-flex ll-items-center ll-flex-col ll-w-full">
        <div className="ll-text-xs ll-font-semibold">Wyliczony czas respu:</div>
        <div className="ll-space-x-2">
          <span className="ll-text-xs ll-font-semibold">min:</span>
          <span className="ll-text-yellow-500">
            {formatSecondsToHHMMSS(minOffset)}
          </span>
          <span className="ll-text-xs ll-font-semibold">max:</span>
          <span className="ll-text-red-500">
            {formatSecondsToHHMMSS(maxOffset)}
          </span>
        </div>
      </div>

      <div className="ll-flex ll-justify-center">
        <button
          type="submit"
          className="ll-text-[12px] ll-border ll-border-gray-400 ll-bg-gray-400/30 hover:ll-bg-gray-400/50 ll-rounded-sm ll-h-5 ll-text-white ll-mt-1"
          disabled={isPending}
        >
          {isPending ? "Dodawanie..." : "Dodaj"}
        </button>
      </div>
    </form>
  );
};
