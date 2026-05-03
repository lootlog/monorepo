import * as z from "zod";

export const generalFormSchema = z.object({
  vanityUrl: z.string(),
  publicStatsCardEnabled: z.boolean(),
});

export type GeneralFormValues = z.infer<typeof generalFormSchema>;
