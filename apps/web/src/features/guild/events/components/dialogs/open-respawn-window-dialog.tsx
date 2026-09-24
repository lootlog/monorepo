import { DialogActionFooter } from "./dialog-action-footer";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
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

const createFormSchema = (t: (key: string) => string) =>
  z
    .object({
      minTime: z.date({ message: t("events.respawn.minTimeRequired") }),
      maxTime: z.date({ message: t("events.respawn.maxTimeRequired") }),
    })
    .refine((data) => data.minTime < data.maxTime, {
      message: t("events.respawn.invalidTimeRange"),
      path: ["maxTime"],
    });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

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
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Timer className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("events.respawn.openWindow")}</DialogTitle>
              <DialogDescription>{heroName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(handleConfirm)}
          >
            <DialogBody className="space-y-4 overflow-y-auto">
              <FormField
                control={form.control}
                name="minTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.respawn.minSpawnTime")}
                    </FormLabel>
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
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.respawn.maxSpawnTime")}
                    </FormLabel>
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
            </DialogBody>

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
