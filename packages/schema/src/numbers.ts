import { flow, Option, Schema, SchemaGetter } from "effect";

const finiteNumberInput = Schema.Union([
  Schema.Finite,
  Schema.String.check(Schema.isPattern(/\S/)).pipe(
    Schema.decodeTo(Schema.Finite, {
      decode: SchemaGetter.transform(Number),
      encode: SchemaGetter.transform(String),
    }),
  ),
]);

/** Decode finite numbers and nonblank numeric strings without coercing other inputs. */
export const parseFiniteNumber = flow(
  Schema.decodeUnknownOption(finiteNumberInput),
  Option.getOrNull,
);
