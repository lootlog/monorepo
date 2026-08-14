import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
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
import { Spinner } from "@lootlog/ui/components/spinner";

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
    await onConfirm({
      minSpawnTime: values.minTime.toISOString(),
      maxSpawnTime: values.maxTime.toISOString(),
    });

    form.reset(getDefaultValues());
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Timer className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.respawn.openWindow")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {heroName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)}>
            <div className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="minTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.respawn.minSpawnTime")}
                    </FormLabel>
                    <FormControl
                      render={
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full"
                        />
                      }
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
                      render={
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full"
                        />
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="px-5 py-3 border-t bg-muted/30 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                {t("events.respawn.openWindowButton")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
