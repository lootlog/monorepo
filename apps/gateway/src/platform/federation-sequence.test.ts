import { expect, test } from "bun:test";
import { FederationSequence } from "./federation-sequence.js";

test("a reordered frame closes its hole within the window instead of reporting a loss", () => {
  const sequence = new FederationSequence(1_000);
  sequence.resume(10, 0);

  expect(sequence.observe(12, 0)).toBe(false);
  expect(sequence.observe(11, 500)).toBe(true);
  expect(sequence.expired(2_000)).toBe(false);
});

test("a hole that outlives the window is a loss, and tracking continues after it", () => {
  const sequence = new FederationSequence(1_000);
  sequence.resume(10, 0);
  sequence.observe(12, 0);

  expect(sequence.expired(999)).toBe(false);
  expect(sequence.expired(1_000)).toBe(true);
  // The late frame belongs to the reported gap and opens no new one.
  sequence.observe(11, 1_100);
  sequence.observe(13, 1_100);
  expect(sequence.expired(5_000)).toBe(false);
});

test("a resubscription proves continuity only once every frame published before it arrives", () => {
  const interrupted = new FederationSequence(1_000);
  interrupted.resume(10, 0);

  expect(interrupted.resume(12, 0)).toBe("pending");
  expect(interrupted.observe(11, 0)).toBe(false);
  expect(interrupted.observe(12, 0)).toBe(true);

  // Frame 14 was published while nobody listened on this subscription.
  const lossy = new FederationSequence(1_000);
  lossy.resume(10, 0);

  expect(lossy.resume(14, 0)).toBe("pending");
  lossy.observe(11, 0);
  lossy.observe(12, 0);
  lossy.observe(13, 0);
  expect(lossy.expired(1_000)).toBe(true);
});

test("an unchanged counter proves an interruption lost nothing", () => {
  const sequence = new FederationSequence(1_000);
  sequence.resume(10, 0);
  sequence.observe(11, 0);

  expect(sequence.resume(11, 0)).toBe("intact");
});

test("a counter reset by Redis data loss is a gap, and later holes are still found", () => {
  const sequence = new FederationSequence(1_000);
  sequence.resume(500, 0);

  // Frames of the new epoch published while this subscriber was away are unknown.
  expect(sequence.resume(2, 0)).toBe("lost");
  sequence.observe(3, 0);
  sequence.observe(5, 0);
  expect(sequence.expired(1_000)).toBe(true);
});
