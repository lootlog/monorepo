import { DialogActionFooter } from "./dialog-action-footer";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Schema } from "effect";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
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

const FormFields = Schema.Struct({
  createNewWindow: Schema.Boolean,
  minTime: Schema.String,
  maxTime: Schema.String,
});

type FormValues = typeof FormFields.Type;

const createFormSchema = (t: (key: string) => string) =>
  Schema.toStandardSchemaV1(
    FormFields.check(
      Schema.makeFilter((data) => {
        if (!data.createNewWindow) return;

        const issues: Array<Schema.FilterIssue> = [];

        if (!data.minTime) {
          issues.push({
            path: ["minTime"],
            issue: t("events.respawn.minTimeRequired"),
          });
        }

        if (!data.maxTime) {
          issues.push({
            path: ["maxTime"],
            issue: t("events.respawn.maxTimeRequired"),
          });
        }

        if (
          data.minTime &&
          data.maxTime &&
          !(new Date(data.minTime) < new Date(data.maxTime))
        ) {
          issues.push({
            path: ["maxTime"],
            issue: t("events.respawn.invalidTimeRange"),
          });
        }

        return issues;
      }),
    ),
  );

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
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      createNewWindow: false,
      minTime: "",
      maxTime: "",
    },
  });

  const createNewWindow = form.watch("createNewWindow");

  const { reset } = form;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleConfirm = async (values: FormValues) => {
    let newMinSpawnTime: string | undefined;
    let newMaxSpawnTime: string | undefined;

    if (values.createNewWindow && values.minTime && values.maxTime) {
      newMinSpawnTime = new Date(values.minTime).toISOString();
      newMaxSpawnTime = new Date(values.maxTime).toISOString();
    }

    if (isLoading) return;

    try {
      await onConfirm({
        createNewWindow: values.createNewWindow,
        newMinSpawnTime,
        newMaxSpawnTime,
      });
      form.reset();
    } catch {
      // Preserve the entered times for retry after the action reports its error.
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isLoading) return;

    if (!isOpen) {
      form.reset();
    }

    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <IconDialogHeader
          icon={XCircle}
          tone="destructive"
          title={t("events.respawn.closeWindow")}
          description={heroName}
        />

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
                    <FormControl
                      render=<Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    />
                    <FormLabel className="cursor-pointer text-sm font-normal">
                      {t("events.respawn.createNewWindow")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              {createNewWindow && (
                <div className="space-y-4 border-t border-border/70 pt-4">
                  <FormField
                    control={form.control}
                    name="minTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("events.respawn.minSpawnTime")}
                        </FormLabel>
                        <FormControl
                          render=<Input
                            type="datetime-local"
                            className="text-sm"
                            {...field}
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
                          render=<Input
                            type="datetime-local"
                            className="text-sm"
                            {...field}
                          />
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogActionFooter
              cancelLabel={t("common.cancel")}
              confirmLabel={t("events.respawn.closeWindowButton")}
              confirmVariant="destructive"
              isPending={isLoading}
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
