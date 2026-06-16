// @ts-nocheck
import type { PiExtensionAPI } from "../../src/piTypes.js";
import { createMockSokosumiClient } from "../../src/client/mockSokosumiClient.js";
import { createHttpSokosumiClient } from "../../src/client/httpSokosumiClient.js";
import { createSokosumiTaskPoller } from "../../src/poller/createSokosumiTaskPoller.js";
import { registerSokosumiCoworkerTools } from "../../src/tools/registerSokosumiCoworkerTools.js";
import { registerSokosumiTools } from "../../src/tools/registerSokosumiTools.js";

export default function sokosumiExtension(pi: PiExtensionAPI) {
  const config = loadConfig();

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(`pi-sokosumi loaded in ${config.extensionMode} mode`, "info");
  });

  if (config.extensionMode === "api") {
    const client = createHttpSokosumiClient({
      apiUrl: config.apiUrl,
      apiKey: config.coworkerApiKey
    });

    registerSokosumiCoworkerTools(pi, client);

    if (config.pollerEnabled) {
      createSokosumiTaskPoller({
        client,
        intervalMs: config.pollIntervalMs,
        limit: config.pollLimit,
        maxPages: config.pollMaxPages,
        shouldProcessEvent: usesDefaultReadyStatuses(config.readyStatuses)
          ? undefined
          : (event) => config.readyStatuses.includes(event.status) && Boolean(event.taskId),
        hasTaskProgress: config.skipExistingProgress ? undefined : () => false,
        createRunningEvent: config.claimEnabled
          ? ({ event, task }) => ({
              status: config.claimStatus,
              origin: config.origin,
              comment: renderTemplate(config.claimComment, { event, task })
            })
          : null,
        createCompletedEvent: config.pollerMode === "complete"
          ? ({ event, task }) => ({
              status: config.completeStatus,
              origin: config.origin,
              comment: renderTemplate(config.completeComment, { event, task })
            })
          : undefined,
        createFailedEvent: ({ event, task, error }) => ({
          status: config.failStatus,
          origin: config.origin,
          comment: renderTemplate(config.failComment, { event, task, error })
        })
      }).start();
    }

    return;
  }

  registerSokosumiTools(pi, createMockSokosumiClient());
}

function loadConfig() {
  const coworkerApiKey = readEnv("SOKOSUMI_COWORKER_API_KEY");

  return {
    extensionMode: coworkerApiKey ? "api" : "mock",
    apiUrl: readEnv("SOKOSUMI_API_URL") || "https://api.preprod.sokosumi.com",
    coworkerApiKey,
    pollerEnabled: readEnv("SOKOSUMI_TASK_POLLER_ENABLED") === "true",
    pollIntervalMs: parsePositiveInteger(readEnv("SOKOSUMI_TASK_POLL_INTERVAL_MS"), 15000),
    pollLimit: parsePositiveInteger(readEnv("SOKOSUMI_TASK_POLL_LIMIT"), 20),
    pollMaxPages: parsePositiveInteger(readEnv("SOKOSUMI_TASK_POLL_MAX_PAGES"), 10),
    readyStatuses: parseList(readEnv("SOKOSUMI_TASK_POLLER_READY_STATUSES") || "READY"),
    skipExistingProgress: readEnv("SOKOSUMI_TASK_POLLER_SKIP_EXISTING_PROGRESS") !== "false",
    pollerMode: normalizePollerMode(readEnv("SOKOSUMI_TASK_POLLER_MODE")),
    claimEnabled: readEnv("SOKOSUMI_TASK_POLLER_CLAIM_ENABLED") !== "false",
    claimStatus: readEnv("SOKOSUMI_TASK_POLLER_CLAIM_STATUS") || "RUNNING",
    completeStatus: readEnv("SOKOSUMI_TASK_POLLER_COMPLETE_STATUS") || "COMPLETED",
    failStatus: readEnv("SOKOSUMI_TASK_POLLER_FAIL_STATUS") || "FAILED",
    origin: readEnv("SOKOSUMI_TASK_POLLER_ORIGIN") || "SOKOSUMI",
    claimComment: readEnv("SOKOSUMI_TASK_POLLER_CLAIM_COMMENT") || "The coworker picked up this task.",
    completeComment:
      readEnv("SOKOSUMI_TASK_POLLER_COMPLETE_COMMENT") ||
      "The coworker processed this task: {task.name}",
    failComment:
      readEnv("SOKOSUMI_TASK_POLLER_FAIL_COMMENT") ||
      "The coworker failed while processing this task: {error.message}"
  };
}

function readEnv(name: string) {
  return globalThis.process?.env?.[name] || "";
}

function parsePositiveInteger(value: string, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePollerMode(value: string) {
  return value === "complete" ? "complete" : "claim";
}

function usesDefaultReadyStatuses(values: string[]) {
  return values.length === 1 && values[0] === "READY";
}

function renderTemplate(template: string, values: { event?: any; task?: any; error?: any }) {
  return template.replace(/\{([^}]+)\}/g, (_match, path) => {
    const value = getPath(values, path);
    return value == null ? "" : String(value);
  });
}

function getPath(source: any, path: string) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}
