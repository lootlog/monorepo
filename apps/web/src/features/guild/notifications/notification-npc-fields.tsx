import { MultiSelect } from "@/components/ui/multi-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Switch } from "@lootlog/ui/components/switch";
import { Textarea } from "@lootlog/ui/components/textarea";
import type { useNotificationRuleForm } from "./hooks/use-notification-rule-form";
import { ALL_WORLDS_VALUE } from "./utils/notification-rule-form.schema";

type Props = Pick<
  ReturnType<typeof useNotificationRuleForm>,
  | "isScheduledMessage"
  | "form"
  | "t"
  | "worldOptions"
  | "handleManualNpcEntryChange"
  | "isManualNpcEntry"
  | "maxNpcCount"
  | "npcOptions"
  | "npcSearch"
  | "setNpcSearch"
  | "searchedNpcQuery"
  | "npcSearchError"
>;

export const NotificationNpcFields = ({
  isScheduledMessage,
  form,
  t,
  worldOptions,
  handleManualNpcEntryChange,
  isManualNpcEntry,
  maxNpcCount,
  npcOptions,
  npcSearch,
  setNpcSearch,
  searchedNpcQuery,
  npcSearchError,
}: Props) => (
  <>
    {!isScheduledMessage ? (
      <>
        <FormField
          control={form.control}
          name="world"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.notifications.fields.world")}
              </FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (!value) return;
                  field.onChange(value);
                }}
                items={[
                  {
                    value: ALL_WORLDS_VALUE,
                    label: <>{t("settings.notifications.allWorlds")}</>,
                  },
                  ...worldOptions.map((world) => ({
                    value: world,
                    label: <>{world}</>,
                  })),
                ]}
              >
                <FormControl
                  render={
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {field.value === ALL_WORLDS_VALUE
                          ? t("settings.notifications.allWorlds")
                          : field.value}
                      </SelectValue>
                    </SelectTrigger>
                  }
                />
                <SelectContent>
                  <SelectItem value={ALL_WORLDS_VALUE}>
                    {t("settings.notifications.allWorlds")}
                  </SelectItem>
                  {worldOptions.map((world) => (
                    <SelectItem key={world} value={world}>
                      {world}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="manualNpcEntry"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between border-b border-border/70 py-3">
              <div className="pr-3">
                <FormLabel className="text-sm font-medium">
                  {t("settings.notifications.manualNpcEntry.checkbox")}
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  {t("settings.notifications.manualNpcEntry.hint")}
                </p>
              </div>
              <FormControl
                render=<Switch
                  checked={field.value}
                  onCheckedChange={handleManualNpcEntryChange}
                />
              />
            </FormItem>
          )}
        />

        {isManualNpcEntry ? (
          <FormField
            control={form.control}
            name="manualNpcIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.fields.manualNpcIds")}
                </FormLabel>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.notifications.validation.maxNpcCount", {
                    count: maxNpcCount,
                  })}
                </p>
                <FormControl
                  render=<Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={4}
                    placeholder={t(
                      "settings.notifications.placeholders.manualNpcIds",
                    )}
                    className="font-mono"
                  />
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.notifications.manualNpcEntry.fieldHint")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="npcIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.fields.npcs")}
                </FormLabel>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.notifications.validation.maxNpcCount", {
                    count: maxNpcCount,
                  })}
                </p>
                <FormControl
                  render=<MultiSelect
                    options={npcOptions}
                    value={field.value ?? []}
                    onValueChange={field.onChange}
                    onClose={field.onChange}
                    placeholder={t("settings.notifications.placeholders.npcs")}
                    controlledSearch
                    searchValue={npcSearch}
                    onSearchChange={setNpcSearch}
                    loading={searchedNpcQuery.isFetching}
                    errorMessage={npcSearchError}
                    searchPlaceholder={t(
                      "settings.notifications.placeholders.searchNpcs",
                    )}
                    emptyMessage={t("settings.notifications.empty.npcs")}
                  />
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </>
    ) : null}
  </>
);
