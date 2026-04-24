import { createServerFn } from "@tanstack/react-start";

export type RuntimeConfig = {
  searchApiUrl: string;
};

export const getRuntimeConfig = createServerFn({ method: "GET" }).handler(
  (): RuntimeConfig => {
    const searchApiUrl = process.env.VITE_SEARCH_API_URL;

    console.log("Runtime VITE_SEARCH_API_URL:", searchApiUrl);

    if (!searchApiUrl) {
      throw new Error("VITE_SEARCH_API_URL must be configured.");
    }

    return {
      searchApiUrl,
    };
  },
);
