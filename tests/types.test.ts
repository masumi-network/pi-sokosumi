import assert from "node:assert/strict";
import test from "node:test";
import {
  isSokosumiEventOrigin,
  isSokosumiTaskEventStatus,
  normalizeSokosumiTaskStatus
} from "../src/client/types.js";

test("Sokosumi type guards only narrow canonical literal values", () => {
  assert.equal(isSokosumiTaskEventStatus("READY"), true);
  assert.equal(isSokosumiTaskEventStatus("QUEUED"), true);
  assert.equal(isSokosumiTaskEventStatus("GRANT_PENDING"), true);
  assert.equal(isSokosumiTaskEventStatus("APPROVAL_REQUIRED"), true);
  assert.equal(isSokosumiTaskEventStatus("CANCEL_REQUESTED"), false);
  assert.equal(isSokosumiTaskEventStatus("ready"), false);
  assert.equal(isSokosumiEventOrigin("SOKOSUMI"), true);
  assert.equal(isSokosumiEventOrigin("USER"), false);
  assert.equal(isSokosumiEventOrigin("sokosumi"), false);
  assert.equal(isSokosumiTaskEventStatus(normalizeSokosumiTaskStatus("ready")), true);
});
