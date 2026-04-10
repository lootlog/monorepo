import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { activityWorldSuggestionsQueryOptions } from "./use-activity-world-suggestions";
import { activityApiClient } from "@/lib/api-client/api-client";

vi.mock("@/lib/api-client/api-client", () => ({
  activityApiClient: {
    get: vi.fn<() => Promise<{ worlds: string[] }>>(),
  },
}));

describe("activityWorldSuggestionsQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the worlds response shape returned by the API", async () => {
    vi.mocked(activityApiClient.get).mockResolvedValue({
      worlds: ["gordion"],
    });

    const queryOptions = activityWorldSuggestionsQueryOptions({
      guildId: "1317554700853444709",
    });

    const queryClient = new QueryClient();
    const data = await queryClient.fetchQuery(queryOptions);

    expect(activityApiClient.get).toHaveBeenCalledWith(
      "/guilds/1317554700853444709/activity-logs/world-suggestions",
      {
        params: {
          search: undefined,
          limit: 20,
        },
      },
    );
    expect(data).toEqual(["gordion"]);
  });
});
