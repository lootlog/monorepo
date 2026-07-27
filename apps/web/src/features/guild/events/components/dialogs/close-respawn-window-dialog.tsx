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
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { XCircle } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";

interface CloseRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
  onConfirm: (options: {
    createNewWindow: boolean;
    newMinSpawnTime?: string;
    newMaxSpawnTime?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const createFormSchema = (t: (key: string) => string) =>
  z
    .object({
      createNewWindow: z.boolean(),
      minTime: z.string(),
      maxTime: z.string(),
    })
    .refine((data) => !data.createNewWindow || data.minTime, {
      message: t("events.respawn.minTimeRequired"),
      path: ["minTime"],
    })
    .refine((data) => !data.createNewWindow || data.maxTime, {
      message: t("events.respawn.maxTimeRequired"),
      path: ["maxTime"],
    })
    .refine(
      (data) =>
        !data.createNewWindow ||
        !data.minTime ||
        !data.maxTime ||
        new Date(data.minTime) < new Date(data.maxTime),
      {
        message: t("events.respawn.invalidTimeRange"),
        path: ["maxTime"],
      },
    );

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export const CloseRespawnWindowDialog = ({
  open,
  onOpenChange,
  heroName,
  onConfirm,
  isLoading = false,
}: CloseRespawnWindowDialogProps) => {
  const { t } = useTranslation();

  const formSchema = createFormSchema(t);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      createNewWindow: false,
      minTime: "",
      maxTime: "",
    },
  });

  const createNewWindow = form.watch("createNewWindow");

  const handleConfirm = async (values: FormValues) => {
    let newMinSpawnTime: string | undefined;
    let newMaxSpawnTime: string | undefined;

    if (values.createNewWindow && values.minTime && values.maxTime) {
      newMinSpawnTime = new Date(values.minTime).toISOString();
      newMaxSpawnTime = new Date(values.maxTime).toISOString();
    }

    await onConfirm({
      createNewWindow: values.createNewWindow,
      newMinSpawnTime,
      newMaxSpawnTime,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="size-4 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.respawn.closeWindow")}
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
              <p className="text-sm text-muted-foreground">
                {t("events.respawn.closeWindowDesc")}
              </p>

              <FormField
                control={form.control}
                name="createNewWindow"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-sm font-normal">
                      {t("events.respawn.createNewWindow")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              {createNewWindow && (
                <div className="space-y-4 rounded-xl border border-muted p-4">
                  <FormField
                    control={form.control}
                    name="minTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("events.respawn.minSpawnTime")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-9 text-sm"
                            {...field}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-9 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
                variant="destructive"
                size="sm"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                {t("events.respawn.closeWindowButton")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
