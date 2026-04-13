import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { generateSlug } from "@lootlog/types";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useUpdateGuild } from "@/hooks/api/guilds/use-update-guild";
import { Card } from "@lootlog/ui/components/card";
import { Link2 } from "lucide-react";
import { useEffect } from "react";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";

const RESTRICTED_NAMES = ["@me"];

const formSchema = z.object({
  vanityUrl: z.string(),
});

export const GeneralForm = () => {
  const { data: guild } = useGuild({});

  const { mutate: updateGuildConfig } = useUpdateGuild();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vanityUrl: guild?.vanityUrl ?? "",
    },
  });

  // Sync form with guild data when it changes
  useEffect(() => {
    if (guild) {
      form.reset({
        vanityUrl: guild.vanityUrl ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild?.vanityUrl]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (RESTRICTED_NAMES.includes(values.vanityUrl)) {
      toast.error("Ta nazwa jest zarezerwowana i nie może być użyta.");
      return;
    }

    updateGuildConfig(
      { vanityUrl: values.vanityUrl.length > 0 ? values.vanityUrl : null },
      {
        onSuccess: (data) => {
          toast.success("Zaktualizowano konfigurację lootloga");
          navigate({ to: `/${data.vanityUrl ?? data.id}/settings` as string });
          form.reset({ vanityUrl: data.vanityUrl ?? "" });
        },
        onError: () => {
          toast.error("Nie udało się zaktualizować konfiguracji lootloga");
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
      >
        <div className="p-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border p-0 gap-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="size-4 text-primary" />
                </div>
                <div>
                  <FormLabel className="text-sm font-semibold">
                    Skrócony link
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Pozwoli dostać się do lootloga z łatwiejszego do
                    zapamiętania adresu
                  </p>
                </div>
              </div>

              <div className="ml-11">
                <FormField
                  control={form.control}
                  name="vanityUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="np. nazwa twojego klanu"
                          className="h-9 max-w-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs mt-2">
                        Przykład:{" "}
                        <span className="text-foreground font-medium">
                          {window.location.origin}/
                          {generateSlug(field.value) || "nazwa-klanu"}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
