import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { z } from "zod";

const animationSchema = z.record(z.string(), z.unknown());

export function useLottieAnimation(url: string) {
  return useQuery(
    {
      queryKey: ["lottie-animation", url],
      queryFn: async ({ signal }) => {
        const response = await fetch(url, { signal });

        if (!response.ok) {
          throw new Error(`Animation request failed: ${response.status}`);
        }

        return animationSchema.parse(await response.json());
      },
      staleTime: Infinity,
      placeholderData: undefined,
    },
    // Loading indicators can appear before the root route mounts its provider.
    queryClient,
  );
}
