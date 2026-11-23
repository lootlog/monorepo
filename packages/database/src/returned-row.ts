import { Effect } from "effect";

export const returnedRow =
  (statement: string) =>
  <Row>(rows: ReadonlyArray<Row>): Effect.Effect<Row> => {
    const [row] = rows;

    return row === undefined
      ? Effect.die(new Error(`${statement} returned no row`))
      : Effect.succeed(row);
  };
