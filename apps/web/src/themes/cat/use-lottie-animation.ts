import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { Schema } from "effect";

const decodeAnimation = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Unknown),
);

export function useLottieAnimation(url: string) {
  return useQuery(
    {
      queryKey: ["lottie-animation", url],
      queryFn: async ({ signal }) => {
        const response = await fetch(url, { signal });

        if (!response.ok) {
          throw new Error(`Animation request failed: ${response.status}`);
        }

        return decodeAnimation(await response.json());
      },
      staleTime: Infinity,
      placeholderData: undefined,
    },
    // Loading indicators can appear before the root route mounts its provider.
    queryClient,
  );
}
