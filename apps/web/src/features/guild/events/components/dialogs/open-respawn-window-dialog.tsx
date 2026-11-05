import { DialogActionFooter } from "./dialog-action-footer";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Schema } from "effect";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Timer } from "lucide-react";

interface OpenRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
  onConfirm: (options: {
    minSpawnTime: string;
    maxSpawnTime: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const requiredDate = (message: string) =>
  Schema.Date.annotate({ message }).annotateKey({ messageMissingKey: message });

const createFormSchema = (t: (key: string) => string) =>
  Schema.toStandardSchemaV1(
    Schema.Struct({
      minTime: requiredDate(t("events.respawn.minTimeRequired")),
      maxTime: requiredDate(t("events.respawn.maxTimeRequired")),
    }).check(
      Schema.makeFilter((data) =>
        data.minTime < data.maxTime
          ? undefined
          : { path: ["maxTime"], issue: t("events.respawn.invalidTimeRange") },
      ),
    ),
  );

type FormValues = ReturnType<typeof createFormSchema>["Type"];

const getDefaultValues = () => {
  const now = new Date();
  const later = new Date();
  later.setHours(later.getHours() + 3);

  return {
    minTime: now,
    maxTime: later,
  };
};

export const OpenRespawnWindowDialog = ({
  open,
  onOpenChange,
  heroName,
  onConfirm,
  isLoading = false,
}: OpenRespawnWindowDialogProps) => {
  const { t } = useTranslation();

  const formSchema = createFormSchema(t);

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(getDefaultValues());
  }, [open, reset]);

  const handleConfirm = async (values: FormValues) => {
    if (isLoading) return;

    try {
      await onConfirm({
        minSpawnTime: values.minTime.toISOString(),
        maxSpawnTime: values.maxTime.toISOString(),
      });
      form.reset(getDefaultValues());
    } catch {
      // Preserve the entered times for retry after the action reports its error.
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isLoading) return;

    if (!isOpen) {
      form.reset(getDefaultValues());
    }

    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <IconDialogHeader
          icon={Timer}
          title={t("events.respawn.openWindow")}
          description={heroName}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)}>
            <div className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="minTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.respawn.minSpawnTime")}</FormLabel>
                    <FormControl
                      render=<DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full"
                      />
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("events.respawn.maxSpawnTime")}</FormLabel>
                    <FormControl
                      render=<DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full"
                      />
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogActionFooter
              cancelLabel={t("common.cancel")}
              confirmLabel={t("events.respawn.openWindowButton")}
              isPending={isLoading}
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
