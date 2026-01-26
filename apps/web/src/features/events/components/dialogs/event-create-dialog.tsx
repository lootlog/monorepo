import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { useCreateEvent } from "../../hooks/mutations/use-create-event";
import { toast } from "sonner";
import { Trophy, Loader2 } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(1, t("events.createDialog.nameRequired")),
      world: z.string().min(1, t("events.createDialog.worldRequired")),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
    })
    .refine(
      (data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt,
      {
        message: t("events.createDialog.endDateMustBeAfterStart"),
        path: ["endsAt"],
      },
    );

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export const EventCreateDialog = ({
  open,
  onOpenChange,
}: EventCreateDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const navigate = useNavigate();
  const { mutate: createEvent, isPending } = useCreateEvent();

  const formSchema = createFormSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      world: "",
      startsAt: new Date(),
      endsAt: undefined,
    },
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = (data: FormData) => {
    createEvent(
      {
        name: data.name.trim(),
        world: data.world.trim(),
        startsAt: data.startsAt?.toISOString(),
        endsAt: data.endsAt?.toISOString(),
      },
      {
        onSuccess: (eventData) => {
          toast.success(t("events.createDialog.success"));
          handleClose(false);
          navigate({ to: `/${guildId}/events/${eventData.id}` });
        },
        onError: () => {
          toast.error(t("events.createDialog.error"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.createDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t("events.createDialog.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("events.createDialog.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.createDialog.namePlaceholder")}
                      className="h-9 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="world"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("events.createDialog.worldLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("events.createDialog.worldPlaceholder")}
                      className="h-9 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.createDialog.startsAtLabel")}
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("events.createDialog.startsAtPlaceholder")}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.createDialog.endsAtLabel")}
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("events.createDialog.endsAtPlaceholder")}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("events.createDialog.datesHint")}
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
                className="flex-1"
              >
                {t("events.createDialog.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    {t("events.createDialog.creating")}
                  </>
                ) : (
                  <>
                    <Trophy className="size-3.5 mr-1.5" />
                    {t("events.create")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
