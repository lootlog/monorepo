import { configureApiClients } from "@lootlog/client/transport";
import type {
  UserLootlogPlayersCatchingGuildsRequestDto,
  UserLootlogPlayersCatchingGuildsResponseDtoOutput,
} from "@lootlog/client/main";
import { onTestFinished, vi } from "vitest";
import { Schema } from "effect";

const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({
    players: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          userId: Schema.String,
          accountId: Schema.String,
          characterId: Schema.String,
        }),
      ),
    ),
  }),
);

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
        const body = decodeRequest(await request.json());

        return Response.json(await endpoint(body, { signal: request.signal }));
      },
    },
  });

  onTestFinished(restore);

  return endpoint;
}
