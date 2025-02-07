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
} from "components/ui/form";
import { Input } from "components/ui/input";
import { useToast } from "components/ui/use-toast";
import { Button } from "@lootlog/ui/components/button";
import { useGuild } from "hooks/api/use-guild";
import { generateSlug } from "utils/generate-slug";
import { cn } from "utils/cn";
import { useUpdateGuild } from "hooks/api/use-update-guild";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  vanityUrl: z.string(),
});

export const GeneralSettingsForm = () => {
  const { data: guild } = useGuild({});

  const { toast } = useToast();
  const { mutate: updateGuildConfig } = useUpdateGuild();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vanityUrl: guild?.vanityUrl ?? "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateGuildConfig(
      { vanityUrl: values.vanityUrl.length > 0 ? values.vanityUrl : null },
      {
        onSuccess: ({ data }) => {
          toast({
            variant: "default",
            description: "Zaktualizowano konfigurację lootloga",
          });
          navigate(`/${data.vanityUrl ?? data.id}/settings`);
          form.resetField("vanityUrl", { defaultValue: data.vanityUrl });
        },
        onError: () => {
          toast({
            variant: "destructive",
            description: "Nie udało się zaktualizować konfiguracji lootloga",
          });
        },
      }
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-3xl py-6"
      >
        <FormField
          control={form.control}
          name="vanityUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skrócony link</FormLabel>
              <FormControl>
                <Input
                  placeholder="np. nazwa twojego klanu"
                  type=""
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Pozwoli dostać się do lootloga z łatwiejszego do zapamiętania
                adresu. <br />
                np:{" "}
                <span className="text-white font-semibold">
                  {window.location.origin}/
                  {generateSlug(field.value) ?? "nazwa-klanu"}
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className={cn(
            "absolute bottom-2 left-0 md:left-68 px-4 py-2 w-full md:w-[calc(100vw-288px)]transition-all",
            {
              "opacity-0": !form.formState.isDirty,
            }
          )}
        >
          <div className=" flex justify-between items-center p-4 border rounded-lg">
            <div className="font-semibold">Masz niezapisane zmiany!</div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => form.reset()}>
                Resetuj
              </Button>
              <Button type="submit" variant="default">
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
