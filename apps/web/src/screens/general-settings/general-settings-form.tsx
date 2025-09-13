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
import { Button } from "@lootlog/ui/components/button";
import { useGuild } from "@/hooks/api/use-guild";
import { AnimatePresence, motion } from "framer-motion";
import { generateSlug } from "@/utils/generate-slug";
import { useUpdateGuild } from "@/hooks/api/use-update-guild";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const RESTRICTED_NAMES = ["@me"];

const formSchema = z.object({
  vanityUrl: z.string(),
});

export const GeneralSettingsForm = () => {
  const { data: guild } = useGuild({});

  const { mutate: updateGuildConfig } = useUpdateGuild();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vanityUrl: guild?.vanityUrl ?? "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (RESTRICTED_NAMES.includes(values.vanityUrl)) {
      toast.error("Ta nazwa jest zarezerwowana i nie może być użyta.");
      return;
    }

    updateGuildConfig(
      { vanityUrl: values.vanityUrl.length > 0 ? values.vanityUrl : null },
      {
        onSuccess: ({ data }) => {
          toast.success("Zaktualizowano konfigurację lootloga");
          navigate(`/${data.vanityUrl ?? data.id}/settings`);
          form.resetField("vanityUrl", { defaultValue: data.vanityUrl });
        },
        onError: () => {
          toast.error("Nie udało się zaktualizować konfiguracji lootloga");
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

        {/* Unsaved changes floating bar with pop animation */}
        <AnimatePresence>
          {form.formState.isDirty && (
            <motion.div
              key="unsaved-bar"
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 28,
                mass: 0.7,
              }}
              className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-[20rem] z-50 flex justify-center px-2 pb-2 sm:px-4"
            >
              <motion.div
                layout
                layoutId="unsaved-bar-inner"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                  mass: 0.6,
                }}
                className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-md border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-md"
              >
                <p className="text-sm font-medium">Masz niezapisane zmiany</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.reset()}
                  >
                    Resetuj
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Form>
  );
};
