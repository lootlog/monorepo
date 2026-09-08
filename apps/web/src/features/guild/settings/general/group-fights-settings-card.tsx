import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@lootlog/ui/components/card";
import {
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormDescription,
} from "@lootlog/ui/components/form";
import { Switch } from "@lootlog/ui/components/switch";
import type { GeneralFormValues } from "./general-form.schema";

export function GroupFightsSettingsCard({
  form,
}: {
  form: UseFormReturn<GeneralFormValues>;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("groupFights.title")}</CardTitle>
        <CardDescription>{t("groupFights.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(["groupFightsEnabled", "groupFightsIncludeIncomplete"] as const).map(
          (name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(
                      name === "groupFightsEnabled"
                        ? "groupFights.enabled"
                        : "groupFights.includeIncomplete",
                    )}
                  </FormLabel>
                  <FormControl
                    render={
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    }
                  />
                  <FormDescription>
                    {t(
                      name === "groupFightsEnabled"
                        ? "groupFights.enabledDescription"
                        : "groupFights.includeIncompleteDescription",
                    )}
                  </FormDescription>
                </FormItem>
              )}
            />
          ),
        )}
      </CardContent>
    </Card>
  );
}
