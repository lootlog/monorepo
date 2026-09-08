import { configureApiClients } from "@lootlog/client/transport";
import type {
  UserLootlogPlayersCatchingGuildsRequestDto,
  UserLootlogPlayersCatchingGuildsResponseDtoOutput,
} from "@lootlog/client/main";
import { onTestFinished, vi } from "vitest";
import { z } from "zod";

const requestSchema = z.object({
  players: z.array(
    z.object({
      userId: z.string(),
      accountId: z.string(),
      characterId: z.string(),
    }),
  ),
}) satisfies z.ZodType<UserLootlogPlayersCatchingGuildsRequestDto>;

export function createCatchingGuildsHttp() {
  const endpoint =
    vi.fn<
      (
        body: UserLootlogPlayersCatchingGuildsRequestDto,
        options: { signal: AbortSignal },
      ) => Promise<UserLootlogPlayersCatchingGuildsResponseDtoOutput>
    >();
  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        if (
          !new URL(request.url).pathname.endsWith(
            "/players/catching-guilds/batch",
          )
        )
          return Response.json(null);
        const body = requestSchema.parse(await request.json());
        return Response.json(await endpoint(body, { signal: request.signal }));
      },
    },
  });
  onTestFinished(restore);
  return endpoint;
}
