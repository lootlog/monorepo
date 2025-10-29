import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  calculateMaxOffsetFromMinOffset,
  calculateRespBaseSecondsFromMinOffset,
  formatSecondsToHHMMSS,
  parseDurationToSeconds,
} from "@/features/timers/helpers/add-timer-form-helpers";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";
import { useSettingsStore } from "@/store/settings.store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NpcType } from "@/hooks/api/use-npcs";

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

const schema = z
  .object({
    name: z.string().min(1).max(20),
    minSpawn: z
      .string()
      .min(1)
      .refine((val) => parseDurationToSeconds(val) > 0, {
        message: "Duration must be greater than 0 seconds",
      }),
    npcType: z
      .enum([NpcType.ELITE2, NpcType.HERO, NpcType.TITAN, "none"])
      .optional(),
    useCustomSpawnTime: z.boolean().optional(),
    customMinSpawnTime: z.string().optional(),
    customMaxSpawnTime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.useCustomSpawnTime) return true;
      if (!data.customMinSpawnTime || !data.customMaxSpawnTime) return false;
      const minTime = new Date(data.customMinSpawnTime);
      const maxTime = new Date(data.customMaxSpawnTime);
      return maxTime > minTime;
    },
    {
      message: "Maksymalny czas musi być późniejszy niż minimalny",
      path: ["customMaxSpawnTime"],
    },
  );

type FormValues = z.infer<typeof schema>;

export const AddTimerForm: React.FC = () => {
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const { world, characterId } = useGlobalStore((state) => state.gameState);
  const { guildIdByCharId } = useSettingsStore();
  const guildId = guildIdByCharId[characterId!];
  const { setOpen } = useWindowsStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      npcType: "none",
      useCustomSpawnTime: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!world || !guildId) return;

    const {
      name,
      minSpawn,
      npcType,
      useCustomSpawnTime,
      customMinSpawnTime,
      customMaxSpawnTime,
    } = data;
    const minSpawnSeconds = parseDurationToSeconds(minSpawn);
    const respawnRandomness = npcType
      ? MULTIPLIER_BY_NPC_TYPE[npcType]
      : DEFAULT_RESPAWN_RANDOMNESS;

    const respBaseSeconds = calculateRespBaseSecondsFromMinOffset(
      minSpawnSeconds,
      respawnRandomness,
    );

    const timerData: any = {
      name,
      respBaseSeconds,
      respawnRandomness,
      world,
      guildId,
    };

    if (useCustomSpawnTime && customMinSpawnTime && customMaxSpawnTime) {
      timerData.customMinSpawnTime = new Date(customMinSpawnTime);
      timerData.customMaxSpawnTime = new Date(customMaxSpawnTime);
    }

    createManualTimer(timerData, {
      onSuccess: () => {
        setOpen("add-timer", false);
      },
    });
  };

  const minSpawn = watch("minSpawn");
  const npcType = watch("npcType");
  const useCustomSpawnTime = watch("useCustomSpawnTime");
  const customMinSpawnTime = watch("customMinSpawnTime");
  const customMaxSpawnTime = watch("customMaxSpawnTime");

  const multiplier = npcType
    ? MULTIPLIER_BY_NPC_TYPE[npcType]
    : DEFAULT_RESPAWN_RANDOMNESS;
  const minOffset = parseDurationToSeconds(
    typeof minSpawn === "string" ? minSpawn : String(minSpawn),
  );
  const maxOffset = calculateMaxOffsetFromMinOffset(minOffset, multiplier);

  const calculateSpawnWindow = () => {
    if (!customMinSpawnTime || !customMaxSpawnTime) return "";
    const minTime = new Date(customMinSpawnTime).getTime();
    const maxTime = new Date(customMaxSpawnTime).getTime();
    const diffMs = maxTime - minTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:space-y-4 ll:box-border ll:mt-2 ll:mx-auto ll:w-[222px]"
    >
      <div className="ll:w-full">
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
        <label htmlFor="role" className="ll:font-semibold ll:text-xs">
          Typ potwora
        </label>
        <Select
          defaultValue={"none"}
          onValueChange={(value) => {
            setValue(
              "npcType",
              value as NpcType.ELITE2 | NpcType.HERO | NpcType.TITAN,
            );
          }}
        >
          <SelectTrigger className="w-[222px] ll:text-white ll:text-xs ll:border-gray-400 ll:rounded-xs ll:h-4 ll:my-1 ll:mb-2 ll-custom-cursor-pointer">
            <SelectValue
              className="ll:h-4 ll:text-sm ll:text-white"
              placeholder="Wybierz typ potwora..."
            />
          </SelectTrigger>
          <SelectContent className="ll:font-sans ll:z-[500] ll:w-[222px] ll:py-1">
            {SELECT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="ll:text-xs ll:font-semibold ll:w-[210px] ll:h-5"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!useCustomSpawnTime && (
        <div className="ll:space-y-1 ll:flex ll:items-center ll:flex-col ll:w-full">
          <div className="ll:text-xs ll:font-semibold">
            Wyliczony czas respu:
          </div>
          <div className="ll:space-x-2">
            <span className="ll:text-xs ll:font-semibold">min:</span>
            <span className="ll:text-yellow-500">
              {formatSecondsToHHMMSS(minOffset)}
            </span>
            <span className="ll:text-xs ll:font-semibold">max:</span>
            <span className="ll:text-red-500">
              {formatSecondsToHHMMSS(maxOffset)}
            </span>
          </div>
        </div>
      )}

      <div className="ll:flex ll:items-center ll:justify-between ll:w-full">
        <label className="ll:text-xs ll:font-semibold">
          Niestandardowy czas spawnu
        </label>
        <input
          type="checkbox"
          {...register("useCustomSpawnTime")}
          className="ll:h-3.5 ll:w-3.5 ll-custom-cursor-pointer"
        />
      </div>

      {useCustomSpawnTime && (
        <div className="ll:space-y-3 ll:border-l-2 ll:border-orange-500 ll:pl-3">
          <div>
            <Label htmlFor="customMinSpawnTime">Minimalny czas spawnu</Label>
            <Input
              id="customMinSpawnTime"
              type="datetime-local"
              {...register("customMinSpawnTime")}
              className="ll:text-xs"
            />
          </div>
          <div>
            <Label htmlFor="customMaxSpawnTime">Maksymalny czas spawnu</Label>
            <Input
              id="customMaxSpawnTime"
              type="datetime-local"
              {...register("customMaxSpawnTime")}
              className="ll:text-xs"
            />
            {errors.customMaxSpawnTime && (
              <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                {errors.customMaxSpawnTime.message}
              </p>
            )}
          </div>
          {customMinSpawnTime && customMaxSpawnTime && (
            <p className="ll:text-xs ll:text-gray-400">
              Okno spawnu: {calculateSpawnWindow()}
            </p>
          )}
        </div>
      )}

      <div className="ll:flex ll:justify-center">
        <button
          type="submit"
          className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:mt-1"
          disabled={isPending}
        >
          {isPending ? "Dodawanie..." : "Dodaj"}
        </button>
      </div>
    </form>
  );
};
