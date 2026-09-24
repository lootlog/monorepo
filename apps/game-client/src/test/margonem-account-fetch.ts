import { vi } from "vitest";
import { MARGONEM_ACCOUNT_VALIDATE_URL } from "@/config/api";

export const stubMargonemAccountFetch = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = input instanceof Request ? input.url : String(input);

    if (url.startsWith(MARGONEM_ACCOUNT_VALIDATE_URL))
      return Promise.resolve(
        Response.json({ error: "No game session in test" }, { status: 503 }),
      );

    return Promise.reject(new Error(`Unexpected external fetch: ${url}`));
  });
