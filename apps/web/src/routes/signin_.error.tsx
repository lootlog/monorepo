import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";
import { optionalOrUndefined } from "@lootlog/schema/stored-value";
import { SignInError } from "@/features/signin/sign-in-error";

const decodeSignInErrorSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    error: optionalOrUndefined(Schema.String),
    retry: optionalOrUndefined(Schema.String),
  }),
);

export const Route = createFileRoute("/signin_/error")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.documentTitle.signinError") }),
  },
  component: SignInError,
  validateSearch: decodeSignInErrorSearch,
});
