import {
  SOKOSUMI_COWORKER_PROGRESS_STATUSES,
  SOKOSUMI_EVENT_CHANNELS,
  SOKOSUMI_TASK_LINK_RELATIONS,
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
  type SokosumiUser,
  type UpdateTaskInput
} from "./types.js";
import { requestJson, stripTrailingSlash, type JsonFetch } from "../jsonHttpTransport.js";
import { createJsonValidators, isRecord, normalizeText } from "../sharedTypes.js";

export type SokosumiFetch = JsonFetch;

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

const {
  expectArray,
  expectBoolean,
  expectNullableString,
  expectNumber,
  expectRecord,
  expectString
} = createJsonValidators(throwInvalidResponse);

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
      const normalizedTaskId = normalizeRequiredInputText(taskId, "task id");
      const payload = await request(`/v1/tasks/${encodeURIComponent(normalizedTaskId)}`);
      const data = expectEnvelope(payload, "task").data;
      return data == null ? undefined : narrowTask(data, "Sokosumi task");
    },

    async updateTask(input) {
      const { taskId, ...body } = input;
      const normalizedTaskId = normalizeRequiredInputText(taskId, "task id");
      const payload = await request(`/v1/tasks/${encodeURIComponent(normalizedTaskId)}`, {
        method: "PATCH",
        body
      });
      return narrowTask(expectEnvelope(payload, "updated task").data, "updated Sokosumi task");
    },

    async getUser(userId, options = {}) {
      const normalizedUserId = normalizeRequiredInputText(userId, "user id");
      const payload = await request(`/v1/users/${encodeURIComponent(normalizedUserId)}`, {
        headers: createDelegationHeaders({
          userId: normalizedUserId,
          organizationId: options.organizationId,
          organizationSlug: options.organizationSlug
        })
      });
      const data = expectEnvelope(payload, "user").data;
      return data == null ? undefined : narrowUser(data);
    },

    async createTaskEvent(taskId, body) {
      const normalizedTaskId = normalizeRequiredInputText(taskId, "task id");
      const normalizedBody = normalizeTaskEventInput(body);
      const payload = await request(`/v1/tasks/${encodeURIComponent(normalizedTaskId)}/events`, {
        method: "POST",
        body: normalizedBody
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

    return requestJson({
      fetchImpl,
      url: `${baseUrl}${path}`,
      timeoutMs,
      method: options.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...normalizeRequestHeaders(options.headers)
      },
      body: options.body,
      createTimeoutError: (error) => new SokosumiRequestError(
        `Sokosumi request timed out after ${timeoutMs}ms`,
        { code: "timeout", cause: error }
      ),
      createHttpError: ({ statusCode, payload }) => {
        const message = isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : `Sokosumi request failed with ${statusCode}`;
        return new SokosumiRequestError(`${message} (${statusCode})`, {
          code: "http_error",
          statusCode,
          payload
        });
      }
    });
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
  const referenceId = normalizeText(input.referenceId || aliases.reference_id);

  return {
    userId,
    organizationId,
    idempotencyKey,
    credits,
    ...(referenceId ? { referenceId } : {})
  };
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = normalizeText(value);
  if (!text) throw new Error(`Sokosumi coworker usage requires ${label}.`);
  return text;
}

function normalizeRequiredInputText(value: unknown, label: string): string {
  const text = normalizeText(value);
  if (!text) throw new Error(`Sokosumi ${label} is required.`);
  return text;
}

function normalizeTaskEventInput(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Sokosumi task event body must be a JSON object.");
  }

  const { status, comment, credits, masumiPayment, authenticationUrl, channel, origin } = value;
  if (status === undefined && comment === undefined && credits === undefined && masumiPayment === undefined) {
    throw new Error("Sokosumi task event body must include a status, comment, credits, or masumiPayment.");
  }
  if (status !== undefined && !SOKOSUMI_TASK_EVENT_STATUSES.some((candidate) => candidate === status)) {
    throw new Error(`Unsupported Sokosumi task event status: ${String(status)}.`);
  }
  if (status === "AUTHENTICATION_REQUIRED") {
    normalizeRequiredInputText(authenticationUrl, "authentication URL");
  } else if (authenticationUrl !== undefined) {
    throw new Error("Sokosumi authentication URL is only supported for AUTHENTICATION_REQUIRED events.");
  }
  if (comment !== undefined && typeof comment !== "string") {
    throw new Error("Sokosumi task event comment must be a string when provided.");
  }
  if (credits !== undefined && (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 0)) {
    throw new Error("Sokosumi task event credits must be a positive number when provided.");
  }
  if (masumiPayment !== undefined && !isRecord(masumiPayment)) {
    throw new Error("Sokosumi task event masumiPayment must be a JSON object when provided.");
  }
  if (credits !== undefined && masumiPayment !== undefined) {
    throw new Error("Sokosumi task events cannot include both credits and masumiPayment.");
  }
  if (channel !== undefined && origin !== undefined) {
    throw new Error("Sokosumi task events cannot include both channel and origin.");
  }
  for (const [label, candidate] of [["channel", channel], ["origin", origin]] as const) {
    if (candidate !== undefined && !SOKOSUMI_EVENT_CHANNELS.some((item) => item === candidate)) {
      throw new Error(`Unsupported Sokosumi task event ${label}: ${String(candidate)}.`);
    }
  }
  return value;
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
    const header = normalizeText(key);
    if (!header || /^authorization$/i.test(header)) continue;
    const firstValue = Array.isArray(value) ? value.find((item) => normalizeText(item)) : value;
    const normalizedValue = normalizeText(firstValue);
    if (normalizedValue) normalized[header] = normalizedValue;
  }
  return normalized;
}

function expectEnvelope(value: unknown, label: string): Record<string, unknown> {
  return expectRecord(value, `Sokosumi ${label} response`);
}

function expectObjectData(value: unknown, label: string): Record<string, unknown> {
  return expectRecord(expectEnvelope(value, label).data, `Sokosumi ${label}`);
}

function narrowTask(value: unknown, label: string): SokosumiTaskSnapshot {
  const task = expectRecord(value, label);
  for (const key of ["id", "createdAt", "updatedAt", "ownerId", "userId", "name"]) {
    expectString(task[key], `${label}.${key}`);
  }
  narrowUserSummary(task.owner, `${label}.owner`);
  narrowUserSummary(task.user, `${label}.user`);
  expectNullableRecord(task.organization, `${label}.organization`);
  for (const key of [
    "organizationId",
    "projectId",
    "assigneeId",
    "coworkerId",
    "orchestratorId",
    "pendingVendorGrantId",
    "nextRunAt",
    "description"
  ]) {
    expectNullableString(task[key], `${label}.${key}`);
  }
  task.assignee === null
    ? null
    : narrowCoworkerSummary(task.assignee, `${label}.assignee`);
  task.coworker === null
    ? null
    : narrowCoworkerSummary(task.coworker, `${label}.coworker`);
  narrowTaskEventActor(task.creator, `${label}.creator`);
  task.orchestrator === null
    ? null
    : narrowOrchestratorSummary(task.orchestrator, `${label}.orchestrator`);
  expectObservedTaskStatus(task.status, `${label}.status`);
  if (task.grantResumeStatus !== null && task.grantResumeStatus !== "DRAFT" && task.grantResumeStatus !== "READY") {
    throwInvalidResponse(`${label}.grantResumeStatus must be DRAFT, READY, or null.`, task.grantResumeStatus);
  }
  if (task.metadata !== null && typeof task.metadata !== "string") {
    throwInvalidResponse(`${label}.metadata must be a string or null.`, task.metadata);
  }
  expectNumber(task.credits, `${label}.credits`);
  const events = expectArray(task.events, `${label}.events`);
  task.events = events.map((event, index) => narrowTaskEvent(event, `${label}.events[${index}]`));
  expectRecordArray(task.jobs, `${label}.jobs`);
  expectRecord(task.workspace, `${label}.workspace`);
  expectNullableRecord(task.share, `${label}.share`);
  task.links = expectArray(task.links, `${label}.links`).map((link, index) =>
    narrowTaskLink(link, `${label}.links[${index}]`)
  );
  expectRecordArray(task.files, `${label}.files`);
  for (const key of ["title", "body", "content"]) {
    assertOptionalString(task[key], `${label}.${key}`);
  }
  return task as SokosumiTaskSnapshot;
}

function narrowTaskEvent(value: unknown, label: string): SokosumiTaskEvent {
  const event = expectRecord(value, label);
  for (const key of ["id", "taskId", "createdAt", "updatedAt"]) {
    expectString(event[key], `${label}.${key}`);
  }
  if (event.actor === null) {
    // Null is an explicit upstream state when no actor foreign key is set.
  } else {
    narrowTaskEventActor(event.actor, `${label}.actor`);
  }
  expectEventChannel(event.channel, `${label}.channel`);
  expectEventChannel(event.origin, `${label}.origin`);
  for (const key of [
    "message",
    "body",
    "content",
    "description",
    "title",
    "name",
    "created_at",
    "updated_at"
  ]) {
    assertOptionalString(event[key], `${label}.${key}`);
  }
  for (const key of ["transactionId", "comment", "authenticationUrl"]) {
    assertOptionalStringOrNull(event[key], `${label}.${key}`);
  }
  if (event.credits !== undefined && event.credits !== null && typeof event.credits !== "number") {
    throwInvalidResponse(`${label}.credits must be a number or null when provided.`, event.credits);
  }
  assertOptionalStringOrNull(event.coworkerId, `${label}.coworkerId`);
  assertOptionalStringOrNull(event.coworker_id, `${label}.coworker_id`);
  assertOptionalStringOrNull(event.userId, `${label}.userId`);
  assertOptionalStringOrNull(event.orchestratorId, `${label}.orchestratorId`);
  if (event.coworker !== undefined && event.coworker !== null) {
    narrowCoworkerSummary(event.coworker, `${label}.coworker`);
  }
  if (event.user !== undefined && event.user !== null) {
    narrowUserSummary(event.user, `${label}.user`);
  }
  if (event.orchestrator !== undefined && event.orchestrator !== null) {
    narrowOrchestratorSummary(event.orchestrator, `${label}.orchestrator`);
  }
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
    !SOKOSUMI_COWORKER_PROGRESS_STATUSES.some((status) => status === event.status)
  ) {
    throwInvalidResponse(`${label}.status is not a supported Sokosumi event status.`, event.status);
  }
  return event as SokosumiTaskEvent;
}

function narrowPagination(value: unknown): SokosumiPagination {
  const pagination = { ...expectRecord(value, "Sokosumi pagination") };
  if (pagination.nextCursor === null) delete pagination.nextCursor;
  if (pagination.previousCursor === null) delete pagination.previousCursor;
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

function expectNullableRecord(value: unknown, label: string): Record<string, unknown> | null {
  return value === null ? null : expectRecord(value, label);
}

function expectRecordArray(value: unknown, label: string): Record<string, unknown>[] {
  return expectArray(value, label).map((item, index) => expectRecord(item, `${label}[${index}]`));
}

function expectStringArray(value: unknown, label: string): string[] {
  return expectArray(value, label).map((item, index) => expectString(item, `${label}[${index}]`));
}

function expectObservedTaskStatus(value: unknown, label: string): void {
  const taskStatuses = ["draft", "in_progress", "awaiting_approval", "done", "failed"] as const;
  if (
    !taskStatuses.some((status) => status === value) &&
    !SOKOSUMI_COWORKER_PROGRESS_STATUSES.some((status) => status === value)
  ) {
    throwInvalidResponse(`${label} is not a supported Sokosumi task status.`, value);
  }
}

function expectEventChannel(value: unknown, label: string): void {
  if (!SOKOSUMI_EVENT_CHANNELS.some((channel) => channel === value)) {
    throwInvalidResponse(`${label} is not a supported Sokosumi event channel.`, value);
  }
}

function narrowUserSummary(value: unknown, label: string): Record<string, unknown> {
  const user = expectRecord(value, label);
  expectString(user.id, `${label}.id`);
  expectString(user.name, `${label}.name`);
  assertOptionalStringOrNull(user.image, `${label}.image`);
  return user;
}

function narrowCoworkerSummary(value: unknown, label: string): Record<string, unknown> {
  const coworker = expectRecord(value, label);
  expectString(coworker.id, `${label}.id`);
  expectString(coworker.name, `${label}.name`);
  expectString(coworker.slug, `${label}.slug`);
  assertOptionalStringOrNull(coworker.image, `${label}.image`);
  return coworker;
}

function narrowOrchestratorSummary(value: unknown, label: string): Record<string, unknown> {
  const orchestrator = expectRecord(value, label);
  expectString(orchestrator.id, `${label}.id`);
  return orchestrator;
}

function narrowTaskEventActor(value: unknown, label: string): Record<string, unknown> {
  const actor = expectRecord(value, label);
  expectString(actor.id, `${label}.id`);
  if (actor.type === "user") {
    narrowUserSummary(actor.user, `${label}.user`);
  } else if (actor.type === "coworker") {
    narrowCoworkerSummary(actor.coworker, `${label}.coworker`);
  } else if (actor.type === "orchestrator") {
    narrowOrchestratorSummary(actor.orchestrator, `${label}.orchestrator`);
  } else {
    throwInvalidResponse(`${label}.type must identify a user, coworker, or orchestrator.`, actor.type);
  }
  return actor;
}

function narrowTaskLink(value: unknown, label: string): Record<string, unknown> {
  const link = expectRecord(value, label);
  for (const key of ["id", "createdAt", "updatedAt"]) {
    expectString(link[key], `${label}.${key}`);
  }
  if (!SOKOSUMI_TASK_LINK_RELATIONS.some((relation) => relation === link.relation)) {
    throwInvalidResponse(`${label}.relation is not a supported task-link relation.`, link.relation);
  }
  const peerTask = expectRecord(link.peerTask, `${label}.peerTask`);
  expectString(peerTask.id, `${label}.peerTask.id`);
  expectString(peerTask.name, `${label}.peerTask.name`);
  expectObservedTaskStatus(peerTask.status, `${label}.peerTask.status`);
  expectNullableString(peerTask.archivedAt, `${label}.peerTask.archivedAt`);
  expectNullableString(link.note, `${label}.note`);
  return link;
}

function assertOptionalArray(value: unknown, label: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throwInvalidResponse(`${label} must be a JSON array when provided.`, value);
  }
}

function narrowCoworker(value: unknown): SokosumiCoworker {
  const coworker = expectRecord(value, "Sokosumi coworker");
  for (const key of ["id", "createdAt", "updatedAt", "slug", "name"]) {
    expectString(coworker[key], `Sokosumi coworker.${key}`);
  }
  expectNullableString(coworker.archivedAt, "Sokosumi coworker.archivedAt");
  expectBoolean(coworker.isWhitelisted, "Sokosumi coworker.isWhitelisted");
  expectNumber(coworker.priority, "Sokosumi coworker.priority");
  for (const key of ["caption", "url", "description", "image"]) {
    assertOptionalStringOrNull(coworker[key], `Sokosumi coworker.${key}`);
  }
  expectRecord(coworker.vendor, "Sokosumi coworker.vendor");
  expectNullableString(coworker.baseURL, "Sokosumi coworker.baseURL");
  expectStringArray(coworker.capabilities, "Sokosumi coworker.capabilities");
  expectNullableRecord(coworker.metadata, "Sokosumi coworker.metadata");
  return coworker as SokosumiCoworker;
}

function narrowUser(value: unknown): SokosumiUser {
  const user = expectRecord(value, "Sokosumi user");
  for (const key of ["id", "createdAt", "updatedAt", "name", "email", "role"]) {
    expectString(user[key], `Sokosumi user.${key}`);
  }
  expectBoolean(user.emailVerified, "Sokosumi user.emailVerified");
  assertOptionalStringOrNull(user.image, "Sokosumi user.image");
  assertOptionalStringOrNull(user.organizationId, "Sokosumi user.organizationId");
  return user as SokosumiUser;
}

function narrowCoworkerUsage(value: unknown): SokosumiCoworkerUsage {
  const usage = expectRecord(value, "Sokosumi coworker usage");
  for (const key of [
    "id",
    "createdAt",
    "updatedAt",
    "idempotencyKey",
    "coworkerId",
    "userId",
    "transactionId"
  ]) {
    expectString(usage[key], `Sokosumi coworker usage.${key}`);
  }
  expectNullableString(usage.referenceId, "Sokosumi coworker usage.referenceId");
  expectNullableString(usage.organizationId, "Sokosumi coworker usage.organizationId");
  expectNumber(usage.credits, "Sokosumi coworker usage.credits");
  return usage as SokosumiCoworkerUsage;
}

function throwInvalidResponse(message: string, payload: unknown): never {
  throw new SokosumiRequestError(message, { code: "invalid_response", payload });
}

export type {
  CreateCoworkerUsageInput,
  ListSokosumiCoworkerEventsInput,
  SokosumiCoworker,
  SokosumiCoworkerEventPage,
  SokosumiCoworkerSummary,
  SokosumiCoworkerUsage,
  SokosumiDelegationOptions,
  SokosumiEventChannel,
  SokosumiEventOrigin,
  SokosumiNonAuthenticationTaskEventStatus,
  SokosumiOrchestratorSummary,
  SokosumiPagination,
  SokosumiTaskCreator,
  SokosumiTaskEvent,
  SokosumiTaskEventActor,
  SokosumiTaskEventInput,
  SokosumiTaskLink,
  SokosumiTaskLinkRelation,
  SokosumiTaskSnapshot,
  SokosumiUser,
  SokosumiUserSummary
} from "./types.js";
