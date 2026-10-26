import { expect, it } from "bun:test";
import { Effect } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";
import { makeMargonemAccountProfiles } from "./margonem-account-profiles.js";

const row = (world: string, characterId: string) =>
  `<li data-nick="Hero" data-lvl="69" data-world="#${world}" class="char-row " data-id="${characterId}" tabindex="0">`;

// Serves the given responses in order, repeating the last one.
const servingProfiles = (responses: Array<() => Response>) => {
  let reads = 0;

  const client = HttpClient.make((request) =>
    Effect.sync(() => {
      const respond = responses[Math.min(reads, responses.length - 1)];
      reads += 1;

      return HttpClientResponse.fromWeb(request, respond());
    }),
  );

  return { client, reads: () => reads };
};

const query = { world: "aether", accountId: "9101", characterId: "101" };

const runWithClock = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestClock.layer())));

it("lists a character only on the world the profile shows it on", async () => {
  const margonem = servingProfiles([
    () => new Response(`<ul>${row("gordion", "101")}</ul>`),
  ]);

  const profiles = makeMargonemAccountProfiles(
    { profileUrl: "https://margonem.test/profile/view" },
    margonem.client,
  );

  const [onGordion, onAether] = await runWithClock(
    Effect.all([
      profiles.listsCharacter({ ...query, world: "gordion" }),
      profiles.listsCharacter(query),
    ]),
  );

  expect(onGordion).toBe(true);
  expect(onAether).toBe(false);
  expect(margonem.reads()).toBe(1);
});

it("reads the profile again for a character created after it was cached", async () => {
  const margonem = servingProfiles([
    () => new Response("<ul></ul>"),
    () => new Response(`<ul>${row("aether", "101")}</ul>`),
  ]);

  const profiles = makeMargonemAccountProfiles(
    { profileUrl: "https://margonem.test/profile/view" },
    margonem.client,
  );

  const [early, soon, later] = await runWithClock(
    Effect.gen(function* () {
      const early = yield* profiles.listsCharacter(query);
      const soon = yield* profiles.listsCharacter(query);
      yield* TestClock.adjust("11 minutes");
      const later = yield* profiles.listsCharacter(query);

      return [early, soon, later];
    }),
  );

  expect([early, soon, later]).toEqual([false, false, true]);
  expect(margonem.reads()).toBe(2);
});

it("keeps answering from the last profile while Margonem is unreachable", async () => {
  const margonem = servingProfiles([
    () => new Response(`<ul>${row("aether", "101")}</ul>`),
    () => new Response("down", { status: 503 }),
  ]);

  const profiles = makeMargonemAccountProfiles(
    { profileUrl: "https://margonem.test/profile/view" },
    margonem.client,
  );

  const listed = await runWithClock(
    Effect.gen(function* () {
      yield* profiles.listsCharacter(query);
      yield* TestClock.adjust("7 hours");

      return yield* profiles.listsCharacter(query);
    }),
  );

  expect(listed).toBe(true);
  expect(margonem.reads()).toBe(2);
});
