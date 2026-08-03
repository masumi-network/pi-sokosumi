import assert from "node:assert/strict";
import test from "node:test";
import {
  isSokosumiEventOrigin,
  isSokosumiTaskEventStatus,
  normalizeSokosumiTaskStatus
} from "../src/client/types.js";

test("Sokosumi type guards only narrow canonical literal values", () => {
  assert.equal(isSokosumiTaskEventStatus("READY"), true);
  assert.equal(isSokosumiTaskEventStatus("ready"), false);
  assert.equal(isSokosumiEventOrigin("SOKOSUMI"), true);
  assert.equal(isSokosumiEventOrigin("sokosumi"), false);
  assert.equal(isSokosumiTaskEventStatus(normalizeSokosumiTaskStatus("ready")), true);
});
