import {
  SOKOSUMI_COWORKER_PROGRESS_STATUSES,
  SOKOSUMI_EVENT_ORIGINS,
  SOKOSUMI_TASK_EVENT_STATUSES,
  type CreateCoworkerUsageInput,
  type ListSokosumiCoworkerEventsInput,
  type SokosumiCoworker,
  type SokosumiCoworkerEventPage,
  type SokosumiCoworkerUsage,
  type SokosumiDelegationOptions,
  type SokosumiPagination,
  type SokosumiTaskEvent,
  type SokosumiTaskEventInput,
  type SokosumiTaskSnapshot,
  type SokosumiTaskStatus,
  type SokosumiUser,
  type UpdateTaskInput
} from "./types.js";
import { isRecord } from "../sharedTypes.js";

export type SokosumiFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Pick<Response, "ok" | "status" | "text">>;

export type HttpSokosumiClientOptions = {
  apiUrl?: string;
  apiKey?: string;
  fetchImpl?: SokosumiFetch;
  timeoutMs?: number;
};

export type UpdateSokosumiTaskInput = UpdateTaskInput & Record<string, unknown>;

type CoworkerUsageUser =
  | { userId: string; sokosumiUserId?: string }
  | { userId?: string; sokosumiUserId: string };

type CoworkerUsageIdempotency =
  | { idempotencyKey: string; idempotency_key?: string }
  | { idempotencyKey?: string; idempotency_key: string };

export type HttpCreateCoworkerUsageInput = CoworkerUsageUser & CoworkerUsageIdempotency & {
  credits: number;
  organizationId?: string | null;
  organization_id?: string | null;
  referenceId?: string;
  reference_id?: string;
};

export type SokosumiRequestErrorCode = "http_error" | "timeout" | "invalid_response";

export class SokosumiRequestError extends Error {
  readonly code: SokosumiRequestErrorCode;
  readonly statusCode?: number;
  readonly payload?: unknown;

  constructor(
    message: string,
    options: { code: SokosumiRequestErrorCode; statusCode?: number; payload?: unknown; cause?: unknown }
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SokosumiRequestError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.payload = options.payload;
  }
}

export type SokosumiHttpClient = {
  getCurrentCoworker(): Promise<SokosumiCoworker>;
  listCoworkerEvents(input?: ListSokosumiCoworkerEventsInput): Promise<SokosumiCoworkerEventPage>;
  getTask(taskId: string): Promise<SokosumiTaskSnapshot | undefined>;
  updateTask(input: UpdateSokosumiTaskInput): Promise<SokosumiTaskSnapshot>;
  getUser(userId: string, options?: SokosumiDelegationOptions): Promise<SokosumiUser | undefined>;
  createTaskEvent(taskId: string, body: SokosumiTaskEventInput): Promise<SokosumiTaskEvent>;
  createCoworkerUsage(input: CreateCoworkerUsageInput | HttpCreateCoworkerUsageInput): Promise<SokosumiCoworkerUsage>;
};

type RequestOptions = {
  method?: "GET" | "PATCH" | "POST";
  body?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

export function createHttpSokosumiClient({
  apiUrl,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = 30000
}: HttpSokosumiClientOptions): SokosumiHttpClient {
  const baseUrl = stripTrailingSlash(apiUrl || "https://api.preprod.sokosumi.com");

  return {
    async getCurrentCoworker() {
      const payload = await request("/v1/coworkers/me");
      return narrowCoworker(expectObjectData(payload, "current coworker"));
    },

    async listCoworkerEvents({ limit = 20, cursor } = {}) {
      const search = new URLSearchParams({ limit: String(limit) });
      if (cursor) search.set("cursor", cursor);

      const payload = await request(`/v1/coworkers/me/events?${search}`);
      const result = expectEnvelope(payload, "coworker events");
      const events = result.data === undefined
        ? []
        : expectArray(result.data, "Sokosumi coworker events").map((event, index) =>
            narrowTaskEvent(event, `Sokosumi coworker event ${index}`)
          );
      const meta = isRecord(result.meta) ? result.meta : undefined;
      const pagination = meta?.pagination === undefined
        ? undefined
        : narrowPagination(meta.pagination);

      return { events, pagination };
    },

    async getTask(taskId) {
      const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}`);
      const data = expectEnvelope(payload, "task").data;
      return data == null ? undefined : narrowTask(data, "Sokosumi task");
    },

    async updateTask(input) {
      const { taskId, ...body } = input;
      if (!taskId) throw new Error("Sokosumi task id is required.");
      const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body
      });
      return narrowTask(expectEnvelope(payload, "updated task").data, "updated Sokosumi task");
    },

    async getUser(userId, options = {}) {
      const payload = await request(`/v1/users/${encodeURIComponent(userId)}`, {
        headers: createDelegationHeaders({
          userId,
          organizationId: options.organizationId,
          organizationSlug: options.organizationSlug
        })
      });
      const data = expectEnvelope(payload, "user").data;
      return data == null ? undefined : narrowUser(data);
    },

    async createTaskEvent(taskId, body) {
      const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}/events`, {
        method: "POST",
        body
      });
      return narrowTaskEvent(expectEnvelope(payload, "created task event").data, "created Sokosumi task event");
    },

    async createCoworkerUsage(input) {
      const payload = await request("/v1/coworkers/me/usage", {
        method: "POST",
        body: normalizeCoworkerUsageInput(input)
      });
      return narrowCoworkerUsage(expectObjectData(payload, "created coworker usage"));
    }
  };

  async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!apiKey) {
      throw new Error("Sokosumi API key is required.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Pick<Response, "ok" | "status" | "text">;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...normalizeRequestHeaders(options.headers)
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (isRecord(error) && error.name === "AbortError") {
        throw new SokosumiRequestError(`Sokosumi request timed out after ${timeoutMs}ms`, {
          code: "timeout",
          cause: error
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    const payload = text ? parseJson(text) : {};

    if (!response.ok) {
      const message = isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `Sokosumi request failed with ${response.status}`;
      throw new SokosumiRequestError(`${message} (${response.status})`, {
        code: "http_error",
        statusCode: response.status,
        payload
      });
    }

    return payload;
  }
}

function normalizeCoworkerUsageInput(
  input: CreateCoworkerUsageInput | HttpCreateCoworkerUsageInput
): Record<string, unknown> {
  const aliases: Record<string, unknown> = isRecord(input) ? input : {};
  const userId = normalizeRequiredText(input.userId || aliases.sokosumiUserId, "userId");
  const idempotencyKey = normalizeRequiredText(input.idempotencyKey || aliases.idempotency_key, "idempotencyKey");
  const credits = Number(input.credits);
  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error("Sokosumi coworker usage credits must be a positive number.");
  }

  const organizationIdInput = input.organizationId ?? aliases.organization_id;
  const organizationId = organizationIdInput === null || organizationIdInput === undefined
    ? null
    : normalizeRequiredText(organizationIdInput, "organizationId");
  const referenceId = String(input.referenceId || aliases.reference_id || "").trim();

  return {
    userId,
    organizationId,
    idempotencyKey,
    credits,
    ...(referenceId ? { referenceId } : {})
  };
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = String(value || "").trim();
  if (!text) throw new Error(`Sokosumi coworker usage requires ${label}.`);
  return text;
}

function createDelegationHeaders({
  userId,
  organizationId,
  organizationSlug
}: SokosumiDelegationOptions & { userId: string }): Record<string, string> {
  return normalizeRequestHeaders({
    "X-Delegation-User-Id": userId,
    "X-Delegation-Organization-Id": organizationId,
    "X-Organization-Slug": organizationSlug
  });
}

function normalizeRequestHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
  if (!headers) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const header = String(key || "").trim();
    if (!header || /^authorization$/i.test(header)) continue;
    const firstValue = Array.isArray(value) ? value.find((item) => String(item || "").trim()) : value;
    const normalizedValue = String(firstValue || "").trim();
    if (normalizedValue) normalized[header] = normalizedValue;
  }
  return normalized;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { raw: value };
  }
}

function expectEnvelope(value: unknown, label: string): Record<string, unknown> {
  return expectRecord(value, `Sokosumi ${label} response`);
}

function expectObjectData(value: unknown, label: string): Record<string, unknown> {
  return expectRecord(expectEnvelope(value, label).data, `Sokosumi ${label}`);
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new SokosumiRequestError(`${label} must be a JSON object.`, {
      code: "invalid_response",
      payload: value
    });
  }
  return value;
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SokosumiRequestError(`${label} must be a JSON array.`, {
      code: "invalid_response",
      payload: value
    });
  }
  return value;
}

function narrowTask(value: unknown, label: string): SokosumiTaskSnapshot {
  const task = expectRecord(value, label);
  for (const key of ["id", "name", "title", "description", "body", "content", "userId", "createdAt", "updatedAt"]) {
    assertOptionalString(task[key], `${label}.${key}`);
  }
  assertOptionalStringOrNull(task.organizationId, `${label}.organizationId`);
  assertOptionalStatus(task.status, `${label}.status`);
  assertOptionalRecord(task.metadata, `${label}.metadata`);
  if (task.events !== undefined && !Array.isArray(task.events)) {
    throwInvalidResponse(`${label}.events must be an array when provided.`, task.events);
  }
  if (Array.isArray(task.events)) {
    task.events.forEach((event, index) => narrowTaskEvent(event, `${label}.events[${index}]`));
  }
  return task as SokosumiTaskSnapshot;
}

function narrowTaskEvent(value: unknown, label: string): SokosumiTaskEvent {
  const event = expectRecord(value, label);
  for (const key of [
    "id",
    "taskId",
    "comment",
    "message",
    "body",
    "content",
    "description",
    "title",
    "name",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at"
  ]) {
    assertOptionalString(event[key], `${label}.${key}`);
  }
  assertOptionalStringOrNull(event.coworkerId, `${label}.coworkerId`);
  assertOptionalStringOrNull(event.coworker_id, `${label}.coworker_id`);
  assertOptionalStringOrNull(event.userId, `${label}.userId`);
  assertOptionalRecordOrNull(event.coworker, `${label}.coworker`);
  assertOptionalRecordOrNull(event.user, `${label}.user`);
  assertOptionalRecord(event.metadata, `${label}.metadata`);
  assertOptionalArray(event.attachments, `${label}.attachments`);
  assertOptionalArray(event.media, `${label}.media`);
  assertOptionalArray(event.files, `${label}.files`);
  if (
    event.timestamp !== undefined &&
    typeof event.timestamp !== "string" &&
    typeof event.timestamp !== "number"
  ) {
    throwInvalidResponse(`${label}.timestamp must be a string or number when provided.`, event.timestamp);
  }
  if (
    event.status !== undefined &&
    event.status !== null &&
    !SOKOSUMI_COWORKER_PROGRESS_STATUSES.some((status) => status === event.status) &&
    !SOKOSUMI_TASK_EVENT_STATUSES.some((status) => status === event.status)
  ) {
    throwInvalidResponse(`${label}.status is not a supported Sokosumi event status.`, event.status);
  }
  if (event.origin !== undefined && event.origin !== null && !SOKOSUMI_EVENT_ORIGINS.some((origin) => origin === event.origin)) {
    throwInvalidResponse(`${label}.origin is not a supported Sokosumi event origin.`, event.origin);
  }
  return event as SokosumiTaskEvent;
}

function narrowPagination(value: unknown): SokosumiPagination {
  const pagination = expectRecord(value, "Sokosumi pagination");
  assertOptionalString(pagination.nextCursor, "Sokosumi pagination.nextCursor");
  assertOptionalString(pagination.previousCursor, "Sokosumi pagination.previousCursor");
  if (pagination.hasMore !== undefined && typeof pagination.hasMore !== "boolean") {
    throwInvalidResponse("Sokosumi pagination.hasMore must be a boolean when provided.", pagination.hasMore);
  }
  return pagination as SokosumiPagination;
}

function assertOptionalString(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== "string") {
    throwInvalidResponse(`${label} must be a string when provided.`, value);
  }
}

function assertOptionalStringOrNull(value: unknown, label: string): void {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throwInvalidResponse(`${label} must be a string or null when provided.`, value);
  }
}

function assertOptionalRecord(value: unknown, label: string): void {
  if (value !== undefined && !isRecord(value)) {
    throwInvalidResponse(`${label} must be a JSON object when provided.`, value);
  }
}

function assertOptionalRecordOrNull(value: unknown, label: string): void {
  if (value !== undefined && value !== null && !isRecord(value)) {
    throwInvalidResponse(`${label} must be a JSON object or null when provided.`, value);
  }
}

function assertOptionalArray(value: unknown, label: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throwInvalidResponse(`${label} must be a JSON array when provided.`, value);
  }
}

function narrowCoworker(value: unknown): SokosumiCoworker {
  const coworker = expectRecord(value, "Sokosumi coworker");
  for (const key of ["id", "name", "slug"]) {
    assertOptionalString(coworker[key], `Sokosumi coworker.${key}`);
  }
  return coworker as SokosumiCoworker;
}

function narrowUser(value: unknown): SokosumiUser {
  const user = expectRecord(value, "Sokosumi user");
  for (const key of ["id", "name", "image"]) {
    assertOptionalString(user[key], `Sokosumi user.${key}`);
  }
  assertOptionalStringOrNull(user.organizationId, "Sokosumi user.organizationId");
  return user as SokosumiUser;
}

function narrowCoworkerUsage(value: unknown): SokosumiCoworkerUsage {
  const usage = expectRecord(value, "Sokosumi coworker usage");
  for (const key of ["id", "userId", "referenceId"]) {
    assertOptionalString(usage[key], `Sokosumi coworker usage.${key}`);
  }
  assertOptionalStringOrNull(usage.organizationId, "Sokosumi coworker usage.organizationId");
  if (usage.credits !== undefined && typeof usage.credits !== "number") {
    throwInvalidResponse("Sokosumi coworker usage.credits must be a number when provided.", usage.credits);
  }
  return usage as SokosumiCoworkerUsage;
}

function assertOptionalStatus(value: unknown, label: string): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throwInvalidResponse(`${label} must be a string or null when provided.`, value);
  }
  const lowerStatuses: readonly SokosumiTaskStatus[] = ["draft", "in_progress", "awaiting_approval", "done", "failed"];
  if (
    !lowerStatuses.some((status) => status === value) &&
    !SOKOSUMI_TASK_EVENT_STATUSES.some((status) => status === value) &&
    value !== "CANCELLED" &&
    value !== "DONE"
  ) {
    throwInvalidResponse(`${label} is not a supported Sokosumi task status.`, value);
  }
}

function throwInvalidResponse(message: string, payload: unknown): never {
  throw new SokosumiRequestError(message, { code: "invalid_response", payload });
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export type {
  CreateCoworkerUsageInput,
  ListSokosumiCoworkerEventsInput,
  SokosumiCoworker,
  SokosumiCoworkerEventPage,
  SokosumiCoworkerUsage,
  SokosumiDelegationOptions,
  SokosumiPagination,
  SokosumiTaskEvent,
  SokosumiTaskEventInput,
  SokosumiTaskSnapshot,
  SokosumiUser
} from "./types.js";
