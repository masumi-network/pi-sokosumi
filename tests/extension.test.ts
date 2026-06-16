// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import sokosumiExtension from "../extensions/sokosumi/index.js";

test("Sokosumi extension logs an error and registers no tools when coworker key is missing", async () => {
  const previousKey = process.env.SOKOSUMI_COWORKER_API_KEY;
  delete process.env.SOKOSUMI_COWORKER_API_KEY;

  const tools = [];
  const handlers = new Map();
  const errors = [];
  const previousError = console.error;
  console.error = (line) => errors.push(JSON.parse(String(line)));

  try {
    sokosumiExtension({
      registerTool(tool) {
        tools.push(tool);
      },
      on(eventName, handler) {
        handlers.set(eventName, handler);
      }
    });

    assert.equal(tools.length, 0);
    assert.deepEqual(errors, [
      {
        event: "pi_sokosumi_missing_coworker_api_key",
        message: "SOKOSUMI_COWORKER_API_KEY is required; no Sokosumi tools were registered."
      }
    ]);

    const notifications = [];
    await handlers.get("session_start")?.({}, {
      ui: {
        notify(message, level) {
          notifications.push({ message, level });
        }
      }
    });
    assert.deepEqual(notifications, [
      {
        message: "pi-sokosumi disabled: SOKOSUMI_COWORKER_API_KEY is required to register Sokosumi tools.",
        level: "error"
      }
    ]);
  } finally {
    console.error = previousError;
    if (previousKey === undefined) {
      delete process.env.SOKOSUMI_COWORKER_API_KEY;
    } else {
      process.env.SOKOSUMI_COWORKER_API_KEY = previousKey;
    }
  }
});
