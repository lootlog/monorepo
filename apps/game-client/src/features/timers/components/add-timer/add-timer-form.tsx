import { useTranslation } from "react-i18next";
import { CreateManualTimerDtoType } from "@lootlog/client/main";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuildSwitcher } from "@/components/guild-switcher";
import {
  EMPTY_NPC_TYPE_VALUE,
  MANUAL_TIMER_NPC_TYPES,
  MAX_NPC_LEVEL,
  MAX_NPC_NAME_LENGTH,
  MIN_NPC_LEVEL,
  resolveManualTimerNpcType,
} from "@/features/timers/model/add-timer-form-schema";
import {
  type AddTimerFormProps,
  useAddTimerForm,
} from "@/features/timers/hooks/use-add-timer-form";
import { NpcSearchField } from "./npc-search-field";
import { TimerDurationFields } from "./timer-duration-fields";
import { TimerCustomDatesFields } from "./timer-custom-dates-fields";
import { TimerFormFieldError } from "./timer-form-field-error";

const MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS = {
  [CreateManualTimerDtoType.ELITE2]: "elite2",
  [CreateManualTimerDtoType.ELITE3]: "elite3",
  [CreateManualTimerDtoType.HERO]: "hero",
  [CreateManualTimerDtoType.TITAN]: "titan",
} as const satisfies Record<(typeof MANUAL_TIMER_NPC_TYPES)[number], string>;

export function AddTimerForm(props: AddTimerFormProps) {
  const { t } = useTranslation("timers");

  const { form, npcSearch, guild, dates, submit, isPending } =
    useAddTimerForm(props);

  const { errors } = form.formState;
  const nameField = form.register("name");
  const selectedNpcType = form.watch("type") || EMPTY_NPC_TYPE_VALUE;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="ll:flex ll:flex-col ll:h-full ll:overflow-hidden ll:w-full"
    >
      {guild.visibleGuilds.length !== 1 && (
        <div className="ll:shrink-0 ll:pt-1 ll:pb-2">
          {guild.visibleGuilds.length > 1 && (
            <Label>{t("addForm.guildLabel")}</Label>
          )}
          <GuildSwitcher
            value={guild.selectedGuildId}
            onChange={guild.select}
            disabled={isPending}
          />
        </div>
      )}

      <div className="ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <ScrollArea
          data-testid="add-timer-scroll-container"
          className="ll:h-full ll:w-full"
        >
          <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:px-1">
            <NpcSearchField npcSearch={npcSearch} />

            <div className="ll:w-full">
              <Label htmlFor="name">{t("addForm.nameLabel")}</Label>
              <Input
                id="name"
                autoComplete="off"
                placeholder={t("addForm.namePlaceholder")}
                maxLength={MAX_NPC_NAME_LENGTH}
                {...nameField}
                onChange={(event) => {
                  npcSearch.clearSelectedNpc();
                  nameField.onChange(event);
                }}
              />
              <TimerFormFieldError message={errors.name?.message} />
            </div>

            <div className="ll:grid ll:grid-cols-1 ll:gap-2 ll:sm:grid-cols-2 ll:w-full">
              <div className="ll:min-w-0">
                <Label htmlFor="lvl">{t("addForm.lvlLabel")}</Label>
                <Input
                  id="lvl"
                  type="number"
                  min={MIN_NPC_LEVEL}
                  max={MAX_NPC_LEVEL}
                  step={1}
                  autoComplete="off"
                  placeholder={t("addForm.lvlPlaceholder")}
                  {...form.register("lvl")}
                />
                <TimerFormFieldError message={errors.lvl?.message} />
              </div>
              <div className="ll:min-w-0">
                <Label htmlFor="npcType">{t("addForm.typeLabel")}</Label>
                <Select
                  value={selectedNpcType}
                  onValueChange={(value) => {
                    form.setValue("type", resolveManualTimerNpcType(value));
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="npcType"
                    aria-label={t("addForm.typeLabel")}
                  >
                    <SelectValue placeholder={t("addForm.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_NPC_TYPE_VALUE}>
                      {t("addForm.typePlaceholder")}
                    </SelectItem>
                    {MANUAL_TIMER_NPC_TYPES.map((npcType) => (
                      <SelectItem key={npcType} value={npcType}>
                        {t(
                          `common:npcTypes.${MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS[npcType]}`,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TimerDurationFields
              form={form}
              disabled={dates.customDatesEnabled}
            />

            <div className="ll:mt-2 ll:flex ll:items-center ll:gap-2">
              <Switch
                id="customDates"
                checked={dates.customDatesEnabled}
                onCheckedChange={dates.toggle}
              />
              <Label htmlFor="customDates">{t("addForm.customDates")}</Label>
            </div>

            {dates.customDatesEnabled && (
              <TimerCustomDatesFields
                form={form}
                startDate={dates.startDate}
                endDate={dates.endDate}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="ll:flex ll:justify-center ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1 ll:shrink-0">
        <button
          type="submit"
          className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4"
          disabled={isPending || !guild.selectedGuildId}
        >
          {isPending ? t("addForm.submitting") : t("addForm.submit")}
        </button>
      </div>
    </form>
  );
}
