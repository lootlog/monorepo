import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Schema } from "effect";

export class SearchUnavailable extends TaggedErrorClass<SearchUnavailable>()(
  "SearchUnavailable",
  { message: Schema.String },
) {}
